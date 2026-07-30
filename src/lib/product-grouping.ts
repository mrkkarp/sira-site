import {
  ProductSchema,
  type Product,
  type ProductSourceRow,
} from "@/lib/schemas/product";
import {
  mapCategory,
  slugify,
  parseDimensionsCm,
  parseSpecEntries,
  parseLeadTimeWeeks,
  parseMayBeOutOfStock,
} from "@/lib/product-mapping";

/**
 * Deliberately split out of `src/lib/products.ts` (Phase G) as a pure,
 * `server-only`-free function: the Horoshop importer (`src/lib/import/
 * horoshop-importer.ts`) needs this exact same grouping logic — the
 * *same* base/custom-colour pairing and slug/category derivation the
 * site itself uses to render the source-JSON bridge catalog — but runs
 * as a plain Node CLI script outside of Next's build, where the real
 * `server-only` package (not an installed dependency; only resolvable
 * inside Next's own webpack build) can't be imported at all.
 * `src/lib/products.ts` still owns the `server-only` guard + the
 * per-process cache; this module owns only the pure row -> Product
 * mapping.
 */
export function toVariant(row: ProductSourceRow) {
  const text = `${row.shortDesc} ${row.fullDesc}`;
  const gallery = row.gallery.length > 0 ? row.gallery : [row.photo];
  return {
    sku: row.sku,
    colorLabel: row.color || undefined,
    price: row.price,
    photo: row.photo,
    gallery,
    description: row.fullDesc || row.shortDesc,
    leadTimeWeeks: parseLeadTimeWeeks(text),
    mayBeOutOfStock: parseMayBeOutOfStock(text),
  };
}

/**
 * Groups flat Horoshop source rows by `parentSku || sku` into
 * presentation-ready `Product` records (one per colour-variant pair —
 * a "Сірий базовий" base row plus an optional "Свій колір" custom-
 * colour sibling).
 */
export function groupProductSourceRows(rows: ProductSourceRow[]): Product[] {
  const groups = new Map<string, ProductSourceRow[]>();
  for (const row of rows) {
    const key = row.parentSku || row.sku;
    const group = groups.get(key) ?? [];
    group.push(row);
    groups.set(key, group);
  }

  const products: Product[] = [];
  for (const [key, variants] of groups) {
    const base =
      variants.find((row) => row.color === "Сірий базовий") ?? variants[0];
    const customColour = variants.find((row) => row.sku !== base.sku);
    const { shopCategory, sinkType, planterPlacement } = mapCategory(
      base.category,
    );
    const slug = base.alias ? slugify(base.alias) : slugify(key);
    const { heightCm, widthCm } = parseDimensionsCm(base.fullDesc);
    const specEntries = parseSpecEntries(base.fullDesc);

    products.push(
      ProductSchema.parse({
        slug,
        sku: base.sku,
        name: base.name,
        sourceCategory: base.category,
        shopCategory,
        sinkType,
        planterPlacement,
        heightCm,
        widthCm,
        specEntries,
        base: toVariant(base),
        customColour: customColour ? toVariant(customColour) : undefined,
      }),
    );
  }

  return products;
}
