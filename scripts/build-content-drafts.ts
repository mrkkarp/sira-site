import { mkdirSync, writeFileSync, readFileSync, existsSync } from "node:fs";
import path from "node:path";
import rawSource from "../src/data/products.source.json";
import { ProductSourceFileSchema } from "../src/lib/schemas/product";
import { groupProductSourceRows } from "../src/lib/product-grouping";

/**
 * Full-catalogue content draft builder (foundation content, full rollout).
 *
 * Produces `_content-audit/content-all.json` — one entry per canonical
 * storefront product (38), the SAME grouping the site and importer use. For
 * each product it derives a CLEANED Ukrainian `shortDescription` straight from
 * the real Horoshop source text (the owner's own copy), fixing the artifacts
 * that made the raw import unusable:
 *   - decodes HTML entities (`&quot;`, `&#39;`, `&amp;`, …),
 *   - strips stale embedded price lines ("Ціна: 5 450 грн") that contradict
 *     the current structured price,
 *   - drops the trailing "Характеристики …" spec dump (specs render from
 *     structured fields separately),
 *   - collapses whitespace.
 * It invents nothing — it only cleans and reshapes text the source already
 * contains.
 *
 * UK SEO meta is generated deterministically from the product's own
 * name/category/first sentence. The six already-authored pilot products in
 * `pilot-content.json` OVERRIDE the generated UK (and carry hand-written
 * EN/PL); every other product's `en`/`pl` are left empty here and filled by
 * the translation pass before `apply-pilot-content.ts --file=content-all.json`
 * writes them.
 *
 * Run:  npm run content:build
 * Read-only except for the one generated JSON in the gitignored audit folder.
 */

const AUDIT_DIR = path.resolve(process.cwd(), "_content-audit");
const PILOT_FILE = path.join(AUDIT_DIR, "pilot-content.json");
const OUT_FILE = path.join(AUDIT_DIR, "content-all.json");

const CATEGORY_UK: Record<string, string> = {
  sinks: "Раковини",
  planters: "Кашпо",
  tables: "Столи",
  outdoor: "Вуличні вироби",
  "wall-art": "Панно",
  "wall-panels": "Настінні панелі",
};

const NAMED_ENTITIES: Record<string, string> = {
  quot: '"',
  amp: "&",
  nbsp: " ",
  laquo: "«",
  raquo: "»",
  times: "×",
  bull: "•",
  middot: "·",
  sup2: "²",
  sup3: "³",
  deg: "°",
  frac12: "½",
  frac14: "¼",
  frac34: "¾",
  mdash: "—",
  ndash: "–",
  hellip: "…",
  rsquo: "’",
  lsquo: "‘",
  ldquo: "“",
  rdquo: "”",
};

function decodeEntities(s: string): string {
  let t = (s ?? "").replace(/<[^>]+>/g, " ");
  // Numeric entities (decimal + hex).
  t = t.replace(/&#(\d+);/g, (_, n) => String.fromCodePoint(Number(n)));
  t = t.replace(/&#x([0-9a-fA-F]+);/g, (_, h) =>
    String.fromCodePoint(parseInt(h, 16)),
  );
  // Named entities (do &amp; last is unnecessary here — direct map).
  t = t.replace(/&([a-zA-Z][a-zA-Z0-9]+);/g, (m, name) =>
    name in NAMED_ENTITIES ? NAMED_ENTITIES[name] : m,
  );
  return t;
}

/** Emoji / pictographs / dingbats / arrows / variation selectors + ZWJ. */
const EMOJI_RE =
  /[\u{1F000}-\u{1FAFF}\u{2600}-\u{27BF}\u{2190}-\u{21FF}\u{2B00}-\u{2BFF}\u{FE0F}\u{200D}]/gu;

function cleanUk(raw: string): string {
  let t = decodeEntities(raw ?? "");
  t = t.replace(EMOJI_RE, " ");
  // Drop the trailing "Характеристики …" spec dump (specs render separately).
  t = t.split(/Характеристики/i)[0];
  // Strip embedded price/commercial fragments that contradict the structured
  // price field or read as raw commerce copy:
  t = t
    .replace(/[«»"“”•*\-\s]*(Вартість|Ціна)\s*[:\-–—]?[^.\n]*?грн[^.\n]*/gi, " ")
    .replace(/\b\d[\d\s.,]*грн(\s*\/\s*м\s*[²2])?/gi, " ")
    .replace(/ціна\s+без\s+пдв[^.\n]*/gi, " ")
    .replace(/\+\s*\d+\s*%\s*до\s+ціни/gi, " ");
  // Tidy leftover bullet/dash noise from the removals.
  t = t
    .replace(/\s*[•·]\s*/g, " ")
    .replace(/\*+/g, " ")
    .replace(/\(\s*\)/g, " ")
    .replace(/\s+-\s+-\s+/g, " ")
    .replace(/\s{2,}/g, " ");
  // Drop trailing dangling punctuation left by the removals.
  t = t.replace(/[\s\-–—:]+$/g, "");
  return t.replace(/\s+/g, " ").trim();
}

function firstSentences(s: string, max = 155): string {
  const clean = s.replace(/\s+/g, " ").trim();
  if (clean.length <= max) return clean;
  const cut = clean.slice(0, max);
  const lastStop = Math.max(cut.lastIndexOf(". "), cut.lastIndexOf("! "));
  return (lastStop > 60 ? cut.slice(0, lastStop + 1) : cut.trim()) + "…";
}

interface LocaleCopy {
  shortDescription: string;
  seoTitle: string;
  seoDescription: string;
}

interface ContentEntry {
  slug: string;
  sku: string;
  category: string;
  name: string;
  editorialStatusTarget: "published";
  source: "cleaned-source" | "authored-pilot";
  factsUsed: string[];
  notes: string;
  locales: { uk: LocaleCopy; en: LocaleCopy; pl: LocaleCopy };
}

function main() {
  const rows = ProductSourceFileSchema.parse(rawSource as unknown[]);
  const products = groupProductSourceRows(rows);

  const pilotBySlug = new Map<string, unknown>();
  if (existsSync(PILOT_FILE)) {
    const pilot = JSON.parse(readFileSync(PILOT_FILE, "utf8")) as {
      products: { slug: string }[];
    };
    for (const p of pilot.products) pilotBySlug.set(p.slug, p);
  }

  const emptyLocale: LocaleCopy = {
    shortDescription: "",
    seoTitle: "",
    seoDescription: "",
  };

  const entries: ContentEntry[] = products.map((p) => {
    const pilot = pilotBySlug.get(p.slug) as ContentEntry | undefined;
    if (pilot) {
      return { ...pilot, source: "authored-pilot" };
    }

    const uk = cleanUk(p.base.description ?? "");
    const catLabel = CATEGORY_UK[p.shopCategory] ?? "Каталог";
    const seoTitle = `${p.name} — ${catLabel} | ODUDLAB`;
    const seoDescription = firstSentences(uk || p.name, 155);

    return {
      slug: p.slug,
      sku: p.sku,
      category: `${p.shopCategory}${p.sinkType ? ` / ${p.sinkType}` : ""}${p.planterPlacement ? ` / ${p.planterPlacement}` : ""}`,
      name: p.name,
      editorialStatusTarget: "published",
      source: "cleaned-source",
      factsUsed: [
        `specEntries: ${p.specEntries.length}`,
        p.heightCm ? `H ${p.heightCm}cm` : "",
        p.widthCm ? `W ${p.widthCm}cm` : "",
        p.customColour ? "has custom colour" : "",
      ].filter(Boolean),
      notes:
        "UK = cleaned source free-text (entities decoded, stale price/spec-dump removed). EN/PL pending translation.",
      locales: {
        uk: { shortDescription: uk, seoTitle, seoDescription },
        en: { ...emptyLocale },
        pl: { ...emptyLocale },
      },
    };
  });

  mkdirSync(AUDIT_DIR, { recursive: true });
  writeFileSync(
    OUT_FILE,
    JSON.stringify(
      {
        _meta: {
          purpose:
            "Full 38-product content rollout. UK cleaned from real source; 6 pilots authored; EN/PL machine-translated (flagged, invisible on the current single-locale storefront until it is made locale-aware).",
          generatedAt: new Date().toISOString(),
        },
        products: entries,
      },
      null,
      2,
    ),
    "utf8",
  );

  const authored = entries.filter((e) => e.source === "authored-pilot").length;
  const needTranslation = entries.filter(
    (e) => !e.locales.en.shortDescription,
  ).length;
  console.log(`Wrote ${entries.length} products → ${path.relative(process.cwd(), OUT_FILE)}`);
  console.log(`  authored pilots: ${authored}`);
  console.log(`  cleaned-source:  ${entries.length - authored}`);
  console.log(`  need EN/PL:      ${needTranslation}`);
}

main();
