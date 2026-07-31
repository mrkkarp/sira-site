/**
 * Product facts audit (content-foundation deliverable).
 *
 * Reads the real Horoshop snapshot (`src/data/products.source.json`), groups
 * it into presentation products (reusing the exact same grouping the
 * storefront and importer use), and extracts ONLY the facts that are actually
 * present in the source for each product: dimensions, weight, material, mixer
 * type, connection, colour options, lead time, price, gallery size, and the
 * raw "Характеристики" key/value pairs.
 *
 * It invents nothing. Its job is the opposite: to establish the closed set of
 * verifiable facts per product and to FLAG every gap and conflict, so that
 * later description rewriting (UK) and EN/PL translation can be checked
 * against a ground-truth manifest rather than against a model's imagination.
 *
 * Output (written to a gitignored folder, never committed — it mirrors the
 * source catalogue and may carry pre-launch pricing):
 *   _content-audit/facts-audit.json  — machine-readable manifest
 *   _content-audit/facts-audit.md    — human-readable review report
 *
 * Run:  npm run audit:facts
 * Read-only. Touches no database, no network, no secrets.
 */
import { mkdirSync, writeFileSync } from "node:fs";
import path from "node:path";
import rawSource from "@/data/products.source.json" with { type: "json" };
import { ProductSourceFileSchema } from "@/lib/schemas/product";
import { groupProductSourceRows } from "@/lib/product-grouping";

/** Canonical spec labels we expect a fully-described product to carry. Used
 * only to report ABSENCE — never to fabricate a value when absent. */
const EXPECTED_LABELS = ["Матеріал", "Висота", "Вага"] as const;

interface ProductFacts {
  sku: string;
  slug: string;
  name: string;
  sourceCategory: string;
  shopCategory: string;
  sinkType?: string;
  planterPlacement?: string;
  basePriceUah: number;
  hasCustomColour: boolean;
  customColourPriceUah?: number;
  customColourLabel?: string;
  heightCm?: number;
  widthCm?: number;
  leadTimeWeeks?: number;
  mayBeOutOfStock?: boolean;
  galleryCount: number;
  specEntries: { label: string; value: string }[];
  flags: string[];
}

function auditProduct(product: ReturnType<typeof groupProductSourceRows>[number]): ProductFacts {
  const flags: string[] = [];

  // Already parsed at grouping time (see product-grouping.ts / product-
  // mapping.ts) and carried per-variant — reuse rather than re-parse.
  const leadTimeWeeks = product.base.leadTimeWeeks;
  const mayBeOutOfStock = product.base.mayBeOutOfStock;

  // --- gap detection (report absence; never invent) -------------------------
  if (product.specEntries.length === 0) {
    flags.push("NO_SPEC_BLOCK: source row has no parsable «Характеристики» section");
  }
  const labels = new Set(product.specEntries.map((e) => e.label));
  for (const expected of EXPECTED_LABELS) {
    const present = [...labels].some((l) => l.startsWith(expected));
    if (!present) flags.push(`MISSING_SPEC: no «${expected}» entry`);
  }
  if (product.heightCm == null && product.widthCm == null) {
    flags.push("NO_DIMENSIONS: neither height nor width parsed from source");
  }

  // --- conflict detection ---------------------------------------------------
  const byLabel = new Map<string, Set<string>>();
  for (const { label, value } of product.specEntries) {
    const set = byLabel.get(label) ?? new Set<string>();
    set.add(value);
    byLabel.set(label, set);
  }
  for (const [label, values] of byLabel) {
    if (values.size > 1) {
      flags.push(
        `CONFLICT: «${label}» has ${values.size} differing values in source: ${[...values].join(" | ")}`,
      );
    }
  }

  const galleryCount = product.base.gallery?.length ?? 0;
  if (galleryCount === 0) flags.push("NO_GALLERY: no images on source row");

  if (
    product.customColour &&
    product.customColour.price > product.base.price * 2
  ) {
    flags.push(
      `PRICE_ANOMALY: custom-colour price ${product.customColour.price} is >2× base ${product.base.price}`,
    );
  }

  return {
    sku: product.sku,
    slug: product.slug,
    name: product.name,
    sourceCategory: product.sourceCategory,
    shopCategory: product.shopCategory,
    sinkType: product.sinkType,
    planterPlacement: product.planterPlacement,
    basePriceUah: product.base.price,
    hasCustomColour: Boolean(product.customColour),
    customColourPriceUah: product.customColour?.price,
    customColourLabel: product.customColour?.colorLabel,
    heightCm: product.heightCm,
    widthCm: product.widthCm,
    leadTimeWeeks,
    mayBeOutOfStock,
    galleryCount,
    specEntries: product.specEntries,
    flags,
  };
}

function main(): void {
  const rows = ProductSourceFileSchema.parse(rawSource);
  const products = groupProductSourceRows(rows);
  const facts = products.map(auditProduct).sort((a, b) => a.slug.localeCompare(b.slug));

  const byCategory = new Map<string, number>();
  for (const f of facts) byCategory.set(f.shopCategory, (byCategory.get(f.shopCategory) ?? 0) + 1);

  const flagged = facts.filter((f) => f.flags.length > 0);
  const totalFlags = facts.reduce((n, f) => n + f.flags.length, 0);

  const outDir = path.join(process.cwd(), "_content-audit");
  mkdirSync(outDir, { recursive: true });

  const manifest = {
    generatedAt: new Date().toISOString(),
    sourceRowCount: rows.length,
    productCount: facts.length,
    categoryCounts: Object.fromEntries([...byCategory].sort()),
    flaggedProductCount: flagged.length,
    totalFlags,
    products: facts,
  };
  writeFileSync(path.join(outDir, "facts-audit.json"), JSON.stringify(manifest, null, 2) + "\n");

  // --- Markdown report ------------------------------------------------------
  const lines: string[] = [];
  lines.push("# Product facts audit");
  lines.push("");
  lines.push(`Generated: ${manifest.generatedAt}`);
  lines.push("");
  lines.push(`- Source rows: **${rows.length}**`);
  lines.push(`- Grouped products: **${facts.length}**`);
  lines.push(`- Products with flags: **${flagged.length}**`);
  lines.push(`- Total flags: **${totalFlags}**`);
  lines.push("");
  lines.push("## Products per category");
  lines.push("");
  for (const [cat, n] of [...byCategory].sort()) lines.push(`- ${cat}: ${n}`);
  lines.push("");
  lines.push("## Per-product facts");
  lines.push("");
  lines.push(
    "> Only source-verifiable facts are listed. Empty fields mean the source is silent — write nothing there.",
  );
  lines.push("");
  for (const f of facts) {
    lines.push(`### ${f.name}  \`${f.sku}\``);
    lines.push("");
    lines.push(`- slug: \`${f.slug}\``);
    lines.push(`- category: ${f.shopCategory}${f.sinkType ? ` / sink:${f.sinkType}` : ""}${f.planterPlacement ? ` / placement:${f.planterPlacement}` : ""}`);
    lines.push(`- base price: ${f.basePriceUah} UAH`);
    if (f.hasCustomColour) lines.push(`- custom colour: ${f.customColourLabel ?? "—"} @ ${f.customColourPriceUah} UAH`);
    if (f.heightCm != null) lines.push(`- height: ${f.heightCm} cm`);
    if (f.widthCm != null) lines.push(`- width: ${f.widthCm} cm`);
    if (f.leadTimeWeeks != null) lines.push(`- lead time: ${f.leadTimeWeeks} weeks`);
    if (f.mayBeOutOfStock != null) lines.push(`- may be out of stock: ${f.mayBeOutOfStock}`);
    lines.push(`- gallery images: ${f.galleryCount}`);
    if (f.specEntries.length) {
      lines.push("- specs (verbatim from source):");
      for (const e of f.specEntries) lines.push(`  - ${e.label}: ${e.value}`);
    }
    if (f.flags.length) {
      lines.push("- ⚠ flags:");
      for (const flag of f.flags) lines.push(`  - ${flag}`);
    }
    lines.push("");
  }
  writeFileSync(path.join(outDir, "facts-audit.md"), lines.join("\n"));

  // --- console summary ------------------------------------------------------
  console.log(`Facts audit complete.`);
  console.log(`  products: ${facts.length} (from ${rows.length} source rows)`);
  console.log(`  categories: ${[...byCategory].map(([c, n]) => `${c}=${n}`).join(", ")}`);
  console.log(`  flagged products: ${flagged.length}, total flags: ${totalFlags}`);
  console.log(`  wrote: _content-audit/facts-audit.json, _content-audit/facts-audit.md`);
}

main();
