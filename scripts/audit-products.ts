/**
 * READ-ONLY catalogue audit. Boots Payload (Local API, find-only) and diffs the
 * live Postgres catalogue against the original Horoshop export
 * (`_horoshop-export/catalogue-full.json`) to surface, per the owner request:
 *   (a) missing / unpublished products ("багато товарів пропало"),
 *   (b) scattered / misassigned / missing photos ("фото розкидані рандомно"),
 *   (c) translation gaps (uk/en/pl name + short description).
 *
 * Makes NO writes. Run with NODE_ENV=production so the postgres adapter does
 * NOT push schema to the live DB:
 *   NODE_ENV=production node --env-file-if-exists=.env.local \
 *     node_modules/.bin/tsx scripts/audit-products.ts
 */
import { readFileSync } from "node:fs";
import path from "node:path";
import { getPayload } from "payload";
import config from "../payload.config";

const ROOT = process.cwd();

type Row = Record<string, string | null>;

function loadJson<T>(rel: string): T {
  return JSON.parse(readFileSync(path.join(ROOT, rel), "utf8")) as T;
}

// --- Source of truth: original Horoshop export -----------------------------
const catalogue = loadJson<Row[]>("_horoshop-export/catalogue-full.json");
const urlToLocal = loadJson<Record<string, string>>(
  "_horoshop-export/image-url-to-local.json",
);

function basename(u: string): string {
  return (u.split("/").pop() ?? u).split("?")[0];
}

// Split a Horoshop gallery/photo cell (semicolon + newline separated URLs).
function splitImages(cell: string | null | undefined): string[] {
  if (!cell) return [];
  return cell
    .split(/[;\n]+/)
    .map((s) => s.trim())
    .filter(Boolean);
}

// Map a source image URL to the canonical local basename (handles the `+`→`-`
// rename), then strip extension & the trailing content-hash so we compare on a
// stable stem that still embeds the product alias.
function toStem(url: string): string {
  const local = urlToLocal[url];
  const bn = basename(local ?? url);
  return bn.replace(/\.(jpe?g|png|webp|avif)$/i, "").toLowerCase();
}

interface SourceProduct {
  parentSku: string;
  skus: string[];
  alias: string;
  nameUA: string;
  nameEN: string;
  shortUA: string;
  shortEN: string;
  visible: boolean;
  expectedImageStems: string[];
}

const sourceByParent = new Map<string, SourceProduct>();
for (const r of catalogue) {
  const parent = (r["Родительский артикул"] || r["Артикул"] || "").trim();
  if (!parent) continue;
  const isBase = (r["Цвет"] ?? "") === "Сірий базовий";
  const images = [
    ...splitImages(r["Фото"]),
    ...splitImages(r["Галерея"]),
  ].map(toStem);
  const existing = sourceByParent.get(parent);
  if (!existing) {
    sourceByParent.set(parent, {
      parentSku: parent,
      skus: [r["Артикул"] ?? parent],
      alias: (r["Алиас"] ?? "").trim(),
      nameUA: (r["Название (UA)"] ?? "").trim(),
      nameEN: (r["Название (EN)"] ?? "").trim(),
      shortUA: (r["Короткое описание (UA)"] ?? "").trim(),
      shortEN: (r["Короткое описание (EN)"] ?? "").trim(),
      visible: (r["Отображать"] ?? "") === "Да",
      expectedImageStems: images,
    });
  } else {
    existing.skus.push(r["Артикул"] ?? parent);
    existing.expectedImageStems.push(...images);
    if ((r["Отображать"] ?? "") === "Да") existing.visible = true;
    if (isBase) {
      existing.alias = (r["Алиас"] ?? existing.alias).trim();
      existing.nameUA = (r["Название (UA)"] ?? existing.nameUA).trim();
      existing.nameEN = (r["Название (EN)"] ?? existing.nameEN).trim();
    }
  }
}

// Alias stem = the product's own alias (the part every one of its image
// filenames should contain). Use it to spot a photo that belongs to a DIFFERENT
// product.
function aliasStem(alias: string): string {
  return alias.replace(/\.(jpe?g|png|webp|avif)$/i, "").toLowerCase();
}
const allAliasStems = [...sourceByParent.values()]
  .map((p) => aliasStem(p.alias))
  .filter(Boolean);

// --- Live catalogue ---------------------------------------------------------
type Loc = { uk?: string; en?: string; pl?: string } | string | null | undefined;
function pick(v: Loc, loc: "uk" | "en" | "pl"): string {
  if (v == null) return "";
  if (typeof v === "string") return v; // not localized in this fetch
  return (v[loc] ?? "").toString();
}
function mediaName(m: unknown): string {
  if (m && typeof m === "object") {
    const o = m as Record<string, unknown>;
    if (typeof o.filename === "string") return o.filename;
    if (typeof o.url === "string") return basename(o.url);
  }
  return "";
}
function stemOf(filename: string): string {
  return filename.replace(/\.(jpe?g|png|webp|avif)$/i, "").toLowerCase();
}

async function main() {
  const payload = await getPayload({ config });
  const res = await payload.find({
    collection: "products",
    locale: "all" as never,
    depth: 1,
    limit: 0,
    overrideAccess: true,
    // no `where` → every editorialStatus, including drafts/archived
  });
  const live = res.docs as unknown as Array<Record<string, unknown>>;

  const liveBySku = new Map<string, Record<string, unknown>>();
  const liveBySlug = new Map<string, Record<string, unknown>>();
  for (const d of live) {
    if (typeof d.sku === "string") liveBySku.set(d.sku, d);
    if (typeof d.slug === "string") liveBySlug.set(d.slug, d);
  }

  const report = {
    counts: {
      sourceProducts: sourceByParent.size,
      sourceVisible: [...sourceByParent.values()].filter((p) => p.visible)
        .length,
      liveTotal: live.length,
      livePublished: live.filter((d) => d.editorialStatus === "published")
        .length,
    },
    missing: [] as string[],
    notPublished: [] as string[],
    photoIssues: [] as unknown[],
    translationIssues: [] as unknown[],
    extraLive: [] as string[],
  };

  const matchedSlugs = new Set<string>();

  for (const src of sourceByParent.values()) {
    if (!src.visible) continue; // hidden in Horoshop → not expected on site
    const slug = src.alias
      ? src.alias.toLowerCase()
      : src.parentSku.toLowerCase();
    // Match live by sku first, then by slug (alias).
    const doc =
      src.skus.map((s) => liveBySku.get(s)).find(Boolean) ??
      liveBySlug.get(slug);
    if (!doc) {
      report.missing.push(`${src.parentSku} — «${src.nameUA}» (alias:${slug})`);
      continue;
    }
    if (typeof doc.slug === "string") matchedSlugs.add(doc.slug);

    if (doc.editorialStatus !== "published") {
      report.notPublished.push(
        `${src.parentSku} — «${src.nameUA}» → status=${doc.editorialStatus}`,
      );
    }

    // --- Photos ---
    const liveNames = [doc.mainImage, ...((doc.gallery as unknown[]) ?? [])]
      .map(mediaName)
      .filter(Boolean);
    const liveStems = liveNames.map(stemOf);
    const ownStem = aliasStem(src.alias);

    const foreign = liveStems.filter((st) => {
      if (!ownStem) return false;
      if (st.includes(ownStem)) return false;
      // does it look like it belongs to another product?
      return allAliasStems.some(
        (other) => other !== ownStem && other && st.includes(other),
      );
    });
    // expected stems present?
    const expected = [...new Set(src.expectedImageStems)];
    const missingImgs = expected.filter(
      (ex) => !liveStems.some((ls) => ls.includes(ex) || ex.includes(ls)),
    );
    if (foreign.length || missingImgs.length || liveNames.length === 0) {
      report.photoIssues.push({
        product: `${src.parentSku} — «${src.nameUA}»`,
        slug: doc.slug,
        liveCount: liveNames.length,
        expectedCount: expected.length,
        foreignPhotos: foreign,
        missingPhotos: missingImgs.slice(0, 12),
        liveNames,
      });
    }

    // --- Translations ---
    const nameUk = pick(doc.name as Loc, "uk");
    const nameEn = pick(doc.name as Loc, "en");
    const namePl = pick(doc.name as Loc, "pl");
    const shortUk = pick(doc.shortDescription as Loc, "uk");
    const shortEn = pick(doc.shortDescription as Loc, "en");
    const shortPl = pick(doc.shortDescription as Loc, "pl");
    const tIssues: string[] = [];
    if (src.nameEN && (!nameEn || nameEn === nameUk))
      tIssues.push(`name.en missing/==uk (source has EN «${src.nameEN}»)`);
    if (!namePl || namePl === nameUk) tIssues.push("name.pl missing/==uk");
    if (src.shortEN && (!shortEn || shortEn === shortUk))
      tIssues.push("shortDescription.en missing/==uk");
    if (!shortPl || shortPl === shortUk)
      tIssues.push("shortDescription.pl missing/==uk");
    if (tIssues.length) {
      report.translationIssues.push({
        product: `${src.parentSku} — «${src.nameUA}»`,
        slug: doc.slug,
        issues: tIssues,
        names: { uk: nameUk, en: nameEn, pl: namePl },
      });
    }
  }

  // Live products that don't correspond to any visible source product.
  for (const d of live) {
    if (typeof d.slug === "string" && !matchedSlugs.has(d.slug)) {
      report.extraLive.push(
        `${d.sku ?? "?"} / ${d.slug} (status=${d.editorialStatus})`,
      );
    }
  }

  console.log(JSON.stringify(report, null, 2));
  process.exit(0);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
