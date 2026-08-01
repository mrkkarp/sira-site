/**
 * Fill EN/PL product NAME translations (owner-approved). Horoshop had no EN
 * names, so name.en == name.pl == name.uk for every product. This translates
 * only the 19 descriptive names (brand/proper-noun names are left as-is);
 * brand tokens (BUDDHA, ODRI, MONRO, SEMI, SQUARE…) and model codes/dimensions
 * are preserved inside each translation.
 *
 * SAFETY: backs up current uk/en/pl name → _content-audit/name-backup.json.
 * Guards each write on the current uk name matching the mapping's `uk` (so it
 * can't scribble on the wrong product). --apply to write; dry run otherwise.
 *
 * Run (dry):   NODE_ENV=production node --env-file-if-exists=.env.local \
 *                node_modules/.bin/tsx scripts/apply-name-translations.ts
 * Run (apply): ... --apply
 */
import { readFileSync, writeFileSync } from "node:fs";
import path from "node:path";
import { getPayload } from "payload";
import config from "../payload.config";

const APPLY = process.argv.includes("--apply");
const ROOT = process.cwd();

interface T {
  sku: string;
  uk: string;
  en: string;
  pl: string;
}
const map: T[] = JSON.parse(
  readFileSync(path.join(ROOT, "_content-audit", "name-translations.json"), "utf8"),
);

function nameIn(x: unknown, l: string): string {
  if (x == null) return "";
  if (typeof x === "string") return x;
  return ((x as Record<string, unknown>)[l] ?? "").toString();
}

async function main() {
  const payload = await getPayload({ config });
  const backup: unknown[] = [];
  const summary: unknown[] = [];

  for (const t of map) {
    const found = await payload.find({
      collection: "products",
      where: { sku: { equals: t.sku } },
      locale: "all" as never,
      depth: 0,
      limit: 1,
      overrideAccess: true,
    });
    const doc = found.docs[0] as unknown as Record<string, unknown> | undefined;
    if (!doc) {
      summary.push({ sku: t.sku, status: "NOT_FOUND" });
      continue;
    }
    const curUk = nameIn(doc.name, "uk");
    if (curUk !== t.uk) {
      summary.push({
        sku: t.sku,
        status: "UK_MISMATCH_SKIP",
        liveUk: curUk,
        expectedUk: t.uk,
      });
      continue;
    }
    backup.push({
      sku: t.sku,
      id: doc.id,
      before: {
        uk: curUk,
        en: nameIn(doc.name, "en"),
        pl: nameIn(doc.name, "pl"),
      },
    });

    if (APPLY) {
      await payload.update({
        collection: "products",
        id: doc.id as number,
        locale: "en" as never,
        data: { name: t.en },
        overrideAccess: true,
      });
      await payload.update({
        collection: "products",
        id: doc.id as number,
        locale: "pl" as never,
        data: { name: t.pl },
        overrideAccess: true,
      });
    }
    summary.push({ sku: t.sku, status: APPLY ? "UPDATED" : "DRY", en: t.en, pl: t.pl });
  }

  writeFileSync(
    path.join(ROOT, "_content-audit", "name-backup.json"),
    JSON.stringify(backup, null, 2),
  );
  console.log("###SUMMARY###");
  console.log(JSON.stringify({ apply: APPLY, summary }, null, 2));
  process.exit(0);
}
main().catch((e) => {
  console.error(e);
  process.exit(1);
});
