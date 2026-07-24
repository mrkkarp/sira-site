import "server-only";
import rawSource from "@/data/products.source.json";
import {
  ProductSourceFileSchema,
  ProductSchema,
  type Product,
  type ProductSourceRow,
  type ShopCategory,
  type SinkType,
} from "@/lib/schemas/product";

/**
 * Maps the raw Horoshop `category` string (e.g. "Раковини/Підлогові") onto
 * our shop route taxonomy. Extend this — don't invent new source categories.
 */
function mapCategory(sourceCategory: string): {
  shopCategory: ShopCategory;
  sinkType?: SinkType;
} {
  if (sourceCategory.startsWith("Раковини/Підлогові")) {
    return { shopCategory: "sinks", sinkType: "freestanding" };
  }
  if (sourceCategory.startsWith("Раковини/Накладні")) {
    return { shopCategory: "sinks", sinkType: "countertop" };
  }
  if (sourceCategory.startsWith("Раковини")) {
    return { shopCategory: "sinks" };
  }
  if (sourceCategory.startsWith("Вазони")) {
    return { shopCategory: "planters" };
  }
  if (sourceCategory.startsWith("Столики")) {
    return { shopCategory: "tables" };
  }
  if (sourceCategory.startsWith("Вуличні меблі")) {
    return { shopCategory: "outdoor" };
  }
  if (
    sourceCategory.startsWith("Панелі") ||
    sourceCategory.startsWith("Панно")
  ) {
    return { shopCategory: "wall-art" };
  }
  // Unmapped source category — falls back to the closest bucket rather than
  // throwing, so a new Horoshop category doesn't break the whole build.
  return { shopCategory: "wall-art" };
}

function slugify(value: string): string {
  return value
    .replace(/[^a-zA-Z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .toLowerCase();
}

function toVariant(row: ProductSourceRow) {
  return {
    price: row.price,
    photo: row.photo,
    description: row.fullDesc || row.shortDesc,
  };
}

let cachedProducts: Product[] | null = null;

/**
 * Loads, validates and groups the real product export into presentation-ready
 * `Product` records (one per colour-variant pair). Cached per server process —
 * this is static data read from disk, not a live database.
 */
export function getAllProducts(): Product[] {
  if (cachedProducts) return cachedProducts;

  const rows = ProductSourceFileSchema.parse(rawSource satisfies unknown[]);

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
    const { shopCategory, sinkType } = mapCategory(base.category);
    const slug = base.alias ? slugify(base.alias) : slugify(key);

    products.push(
      ProductSchema.parse({
        slug,
        sku: base.sku,
        name: base.name,
        sourceCategory: base.category,
        shopCategory,
        sinkType,
        base: toVariant(base),
        customColour: customColour ? toVariant(customColour) : undefined,
      }),
    );
  }

  cachedProducts = products;
  return products;
}

export function getProductsByCategory(category: ShopCategory): Product[] {
  return getAllProducts().filter(
    (product) => product.shopCategory === category,
  );
}

export function getProductBySlug(slug: string): Product | undefined {
  return getAllProducts().find((product) => product.slug === slug);
}
