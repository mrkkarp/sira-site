import "server-only";
import rawSource from "@/data/products.source.json";
import {
  ProductSourceFileSchema,
  type Product,
  type ShopCategory,
} from "@/lib/schemas/product";
import { groupProductSourceRows } from "@/lib/product-grouping";

let cachedProducts: Product[] | null = null;

/**
 * Loads, validates and groups the real product export into presentation-ready
 * `Product` records (one per colour-variant pair). Cached per server process —
 * this is static data read from disk, not a live database. The actual
 * grouping logic lives in `@/lib/product-grouping` (Phase G) so the
 * Horoshop importer CLI can reuse it without pulling in this module's
 * `server-only` guard.
 */
export function getAllProducts(): Product[] {
  if (cachedProducts) return cachedProducts;

  const rows = ProductSourceFileSchema.parse(rawSource satisfies unknown[]);
  cachedProducts = groupProductSourceRows(rows);
  return cachedProducts;
}

export function getProductsByCategory(category: ShopCategory): Product[] {
  return getAllProducts().filter(
    (product) => product.shopCategory === category,
  );
}

export function getProductBySlug(slug: string): Product | undefined {
  return getAllProducts().find((product) => product.slug === slug);
}
