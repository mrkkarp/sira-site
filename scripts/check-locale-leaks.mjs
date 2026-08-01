/**
 * Crawls every published product page in every locale against a running
 * server and reports Cyrillic text left on the `en` / `pl` pages.
 *
 * Written after a manual spot-check of ONE product missed a defect that was
 * present on the others: the colour label rendered in Ukrainian on every
 * locale because it was read from the static Horoshop snapshot rather than
 * from Payload. One page is not a verification.
 *
 * Only *visible* markup is inspected — `<script>` blocks are stripped first,
 * because the RSC flight payload legitimately carries Ukrainian (the uk copy
 * of shared components) and dictionary *keys* are Latin regardless of locale.
 *
 * Product names are reported separately rather than counted as leaks: some are
 * deliberately untranslated brand names (SEMI, MONRO, ODRI), and telling those
 * apart from a genuinely missing translation is a judgement call for a human.
 *
 *   node scripts/check-locale-leaks.mjs [baseUrl]      # default localhost:3100
 */
const BASE = process.argv[2] ?? "http://localhost:3100";

const res = await fetch(`${BASE}/sitemap.xml`);
const xml = await res.text();
// The sitemap advertises `uk` only (see src/lib/seo/indexing.ts), so the paths
// it lists are the unprefixed uk ones; the en/pl URLs are those same paths
// under a locale prefix.
const paths = [
  ...new Set(
    [...xml.matchAll(/<loc>([^<]+)<\/loc>/g)].map((m) =>
      new URL(m[1]).pathname.replace(/\/$/, ""),
    ),
  ),
];
if (paths.length === 0) {
  console.error("No URLs in the sitemap — is the server running?");
  process.exit(1);
}
console.log(`Сторінок у sitemap: ${paths.length}\n`);

/** Visible text only: drop scripts/styles, then tags, then collapse space. */
function visibleText(html) {
  return html
    .replace(/<script[\s\S]*?<\/script>/g, " ")
    .replace(/<style[\s\S]*?<\/style>/g, " ")
    .replace(/<[^>]+>/g, "\n")
    .replace(/&[a-z]+;|&#\d+;/g, " ");
}

const CYRILLIC = /[Ѐ-ӿ]/;
const leaks = new Map(); // "locale|phrase" -> Set(slug)
let checked = 0;

for (const path of paths) {
  for (const locale of ["en", "pl"]) {
    const url = `${BASE}/${locale}${path}`;
    const r = await fetch(url);
    if (!r.ok) {
      console.log(`  ! ${locale}${path}: HTTP ${r.status}`);
      continue;
    }
    checked++;
    const lines = visibleText(await r.text())
      .split("\n")
      .map((l) => l.trim())
      .filter((l) => l && CYRILLIC.test(l));
    for (const line of new Set(lines)) {
      const key = `${locale}|${line}`;
      if (!leaks.has(key)) leaks.set(key, new Set());
      leaks.get(key).add(path);
    }
  }
}

console.log(`Перевірено сторінок: ${checked}\n`);
if (leaks.size === 0) {
  console.log("Кирилиці у видимому тексті en/pl не знайдено.");
} else {
  console.log("Кирилиця у видимому тексті en/pl:");
  const rows = [...leaks.entries()].sort((a, b) => b[1].size - a[1].size);
  for (const [key, slugSet] of rows) {
    const [locale, phrase] = key.split("|");
    const sample = [...slugSet].slice(0, 3).join(", ");
    const more = slugSet.size > 4 ? `, +${slugSet.size - 4}` : "";
    console.log(
      `  [${locale}] ${slugSet.size.toString().padStart(2)}× ${JSON.stringify(phrase.slice(0, 70))}  (${sample}${more})`,
    );
  }
}
