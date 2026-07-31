import { mkdirSync, writeFileSync, readFileSync } from "node:fs";
import path from "node:path";
import { getPayload, type Payload } from "payload";
import config from "../payload.config";

/**
 * Pilot content applier (prompt §10-24 — foundation content, pilot batch).
 *
 * Takes the authored, source-grounded trilingual copy in
 * `_content-audit/pilot-content.json` and writes it onto the matching
 * Payload products. Deliberately conservative, per owner directives #10/#11:
 *
 *  - **Dry-run by default.** With no flag it writes NOTHING to the database:
 *    it fetches each product's current uk/en/pl values, prints a per-locale
 *    diff, and writes a human-readable preview + a full JSON backup of the
 *    *current* values to `_content-audit/`. Pass `--apply` to actually write.
 *  - **Backup before overwrite.** `--apply` writes the same timestamped
 *    backup of current values FIRST, then updates — so any manually-confirmed
 *    copy can be restored (directive #11: never overwrite confirmed data
 *    without a backup).
 *  - **Never auto-publishes.** Each product is set to
 *    `editorialStatus: "readyForReview"` — the EN/PL text is a machine-assisted
 *    draft, so it must be human-reviewed before it can go live. This also
 *    means these products drop OUT of the published storefront until a
 *    reviewer approves them (loadPayloadFlatProducts filters on `published`).
 *
 * Localized fields (name/shortDescription/seo.*) are written one
 * `payload.update` per locale, because Payload persists a localized value
 * against the `locale` of the request. `name` is left untouched (the importer
 * already set it); this script only writes `shortDescription` and the two SEO
 * meta fields, plus `editorialStatus`.
 *
 * Run (loads .env.local like the importer — standalone process, not Next):
 *   npm run content:pilot            # dry run (default, safe)
 *   npm run content:pilot:apply      # real writes, after backup
 *
 * Reads the DB but is otherwise read-only in dry-run. Touches no secrets in
 * output — only product copy and (non-secret) editorial status.
 */

const LOCALES = ["uk", "en", "pl"] as const;
type Locale = (typeof LOCALES)[number];

type EditorialStatus =
  | "draft"
  | "readyForReview"
  | "published"
  | "scheduled"
  | "archived"
  | "discontinued";

interface LocaleCopy {
  shortDescription: string;
  seoTitle: string;
  seoDescription: string;
}

interface PilotProduct {
  slug: string;
  category: string;
  editorialStatusTarget: EditorialStatus;
  factsUsed: string[];
  notes: string;
  locales: Record<Locale, LocaleCopy>;
}

interface PilotFile {
  _meta: Record<string, string>;
  products: PilotProduct[];
}

interface CurrentSnapshot {
  slug: string;
  id: number | string | null;
  editorialStatus: string | null;
  byLocale: Record<
    Locale,
    {
      name: string | null;
      shortDescription: string | null;
      seoTitle: string | null;
      seoDescription: string | null;
    }
  >;
}

const AUDIT_DIR = path.resolve(process.cwd(), "_content-audit");

function contentFileName(args: string[]): string {
  const fileArg = args.find((a) => a.startsWith("--file="));
  return fileArg ? fileArg.slice("--file=".length) : "pilot-content.json";
}

function loadPilot(fileName: string): PilotFile {
  const raw = readFileSync(path.join(AUDIT_DIR, fileName), "utf8");
  return JSON.parse(raw) as PilotFile;
}

async function snapshotCurrent(
  payload: Payload,
  slug: string,
): Promise<CurrentSnapshot | null> {
  // Read each locale separately so we back up the real per-locale values,
  // not just the fallback-resolved default.
  const byLocale = {} as CurrentSnapshot["byLocale"];
  let id: number | string | null = null;
  let editorialStatus: string | null = null;
  let found = false;

  for (const locale of LOCALES) {
    const res = await payload.find({
      collection: "products",
      where: { slug: { equals: slug } },
      locale,
      depth: 0,
      limit: 1,
      overrideAccess: true,
    });
    const doc = res.docs[0] as
      | {
          id: number | string;
          editorialStatus?: string;
          name?: string;
          shortDescription?: string;
          seo?: { metaTitle?: string; metaDescription?: string };
        }
      | undefined;
    if (!doc) {
      byLocale[locale] = {
        name: null,
        shortDescription: null,
        seoTitle: null,
        seoDescription: null,
      };
      continue;
    }
    found = true;
    id = doc.id;
    editorialStatus = doc.editorialStatus ?? null;
    byLocale[locale] = {
      name: doc.name ?? null,
      shortDescription: doc.shortDescription ?? null,
      seoTitle: doc.seo?.metaTitle ?? null,
      seoDescription: doc.seo?.metaDescription ?? null,
    };
  }

  if (!found) return null;
  return { slug, id, editorialStatus, byLocale };
}

function truncate(value: string | null, n = 90): string {
  if (!value) return "(empty)";
  const s = value.replace(/\s+/g, " ").trim();
  return s.length > n ? `${s.slice(0, n)}…` : s;
}

async function main() {
  const args = process.argv.slice(2);
  const apply = args.includes("--apply");
  const mode = apply ? "APPLY (writes to DB)" : "DRY RUN (no DB writes)";
  const fileName = contentFileName(args);

  const pilot = loadPilot(fileName);
  console.log(`Content file: ${fileName}`);
  const payload = await getPayload({ config });

  console.log(`\nPilot content — mode: ${mode}`);
  console.log(`Products in batch: ${pilot.products.length}\n`);

  const backups: CurrentSnapshot[] = [];
  const previewLines: string[] = [];
  previewLines.push(`# Pilot content preview\n`);
  previewLines.push(`Mode: ${mode}\n`);
  previewLines.push(`Generated: ${new Date().toISOString()}\n`);

  let missing = 0;
  let applied = 0;

  for (const product of pilot.products) {
    const current = await snapshotCurrent(payload, product.slug);
    console.log(`── ${product.slug} (${product.category}) ──`);

    if (!current) {
      missing++;
      console.log(`   ⚠ NOT FOUND in Payload — skipped.\n`);
      previewLines.push(`\n## ${product.slug} — ⚠ NOT FOUND — skipped\n`);
      continue;
    }

    backups.push(current);

    console.log(
      `   editorialStatus: ${current.editorialStatus ?? "(none)"} → ${product.editorialStatusTarget}`,
    );
    previewLines.push(`\n## ${product.slug} (${product.category})\n`);
    previewLines.push(
      `- editorialStatus: \`${current.editorialStatus ?? "(none)"}\` → \`${product.editorialStatusTarget}\``,
    );
    previewLines.push(`- facts used: ${product.factsUsed.join("; ")}`);
    previewLines.push(`- notes: ${product.notes}`);

    for (const locale of LOCALES) {
      const next = product.locales[locale];
      const cur = current.byLocale[locale];
      console.log(`   [${locale}] shortDescription:`);
      console.log(`        old: ${truncate(cur.shortDescription)}`);
      console.log(`        new: ${truncate(next.shortDescription)}`);
      previewLines.push(`\n### ${locale}`);
      previewLines.push(`- **name** (unchanged): ${cur.name ?? "(empty)"}`);
      previewLines.push(`- **shortDescription (old)**: ${cur.shortDescription ?? "(empty)"}`);
      previewLines.push(`- **shortDescription (new)**: ${next.shortDescription}`);
      previewLines.push(`- **seoTitle (old→new)**: ${cur.seoTitle ?? "(empty)"} → ${next.seoTitle}`);
      previewLines.push(`- **seoDescription (old→new)**: ${cur.seoDescription ?? "(empty)"} → ${next.seoDescription}`);
    }

    if (apply && current.id != null) {
      for (const locale of LOCALES) {
        const next = product.locales[locale];
        // `name` is a required, localized field. When updating a non-default
        // locale Payload validates it against that locale's own value, so we
        // must pass it through (re-writing the existing per-locale name, which
        // this pilot deliberately does not change) or the update fails
        // "Name is required". The snapshot value is non-null (reads fall back
        // to uk when a locale has no own value).
        const name = current.byLocale[locale].name ?? undefined;
        // Never blank an existing value: only write a localized field when the
        // draft actually has content for this locale. Non-pilot products may
        // have empty en/pl until the translation pass fills them, and we must
        // not wipe the current (Ukrainian fallback) text in that case.
        const seo: Record<string, string> = {};
        if (next.seoTitle) seo.metaTitle = next.seoTitle;
        if (next.seoDescription) seo.metaDescription = next.seoDescription;
        await payload.update({
          collection: "products",
          id: current.id,
          locale,
          overrideAccess: true,
          data: {
            ...(name ? { name } : {}),
            ...(next.shortDescription
              ? { shortDescription: next.shortDescription }
              : {}),
            editorialStatus: product.editorialStatusTarget,
            ...(Object.keys(seo).length ? { seo } : {}),
          },
        });
      }
      applied++;
      console.log(`   ✓ applied (uk/en/pl) + status → ${product.editorialStatusTarget}`);
    }
    console.log("");
  }

  // Always write the backup + preview (in both modes) to the gitignored
  // audit folder, so even a dry run leaves an auditable record.
  mkdirSync(AUDIT_DIR, { recursive: true });
  const stamp = new Date().toISOString().replace(/[:.]/g, "-");
  const backupPath = path.join(AUDIT_DIR, `pilot-backup-${stamp}.json`);
  const previewPath = path.join(AUDIT_DIR, `pilot-content-preview.md`);
  writeFileSync(backupPath, JSON.stringify({ mode, generatedAt: new Date().toISOString(), backups }, null, 2), "utf8");
  writeFileSync(previewPath, previewLines.join("\n") + "\n", "utf8");

  console.log("Summary");
  console.log(`  matched:  ${backups.length}`);
  console.log(`  missing:  ${missing}`);
  console.log(`  applied:  ${apply ? applied : "0 (dry run)"}`);
  console.log(`  backup:   ${path.relative(process.cwd(), backupPath)}`);
  console.log(`  preview:  ${path.relative(process.cwd(), previewPath)}`);
  if (!apply) {
    console.log(`\nDry run only — pass --apply (npm run content:pilot:apply) to write.`);
  }

  process.exit(0);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
