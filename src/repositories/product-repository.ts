import "server-only";
import type { Product } from "@/domain/catalog/product";
import type { ProductId } from "@/domain/shared/ids";

/**
 * `ProductRepository` (Prompt 8 §0/§3) — the one interface the rest of
 * the app is allowed to depend on for product data. Neither call sites
 * nor the two implementations below leak their storage details past
 * this interface: a page/service asks `getProductRepository()` for
 * "the" repository and calls these three methods, never `import
 * rawSource from "@/data/products.source.json"` or `payload.find(...)`
 * directly.
 */
export interface ProductRepository {
  findAll(): Promise<Product[]>;
  findBySlug(slug: string): Promise<Product | null>;
  findByCategorySlug(categorySlug: string): Promise<Product[]>;
  /** Needed by the cart service (Phase D) to re-validate a `CartLine.productId` against the live catalog — a cart line only ever stores the id, never the slug. */
  findById(id: ProductId): Promise<Product | null>;
}

export type CatalogSource = "payload" | "horoshop-snapshot";

let cachedRepository: ProductRepository | null = null;

/**
 * Factory / DI seam. `CATALOG_SOURCE` picks the implementation:
 * defaults to `"horoshop-snapshot"` because the real catalog still
 * lives in `src/data/products.source.json` today — the Payload
 * `products` collection only holds demo/seed data until the Horoshop
 * importer (Phase G) runs a real import. Set `CATALOG_SOURCE=payload`
 * once that import has happened and the storefront should read from
 * Postgres instead. Cached per server process (both implementations
 * are themselves either in-memory-cached JSON or a DB round-trip —
 * neither needs a repository instance recreated per call).
 */
export async function getProductRepository(): Promise<ProductRepository> {
  if (cachedRepository) return cachedRepository;

  const source: CatalogSource =
    process.env.CATALOG_SOURCE === "payload" ? "payload" : "horoshop-snapshot";

  if (source === "payload") {
    const { PayloadProductRepository } =
      await import("./product-repository.payload");
    cachedRepository = new PayloadProductRepository();
  } else {
    const { HoroshopSnapshotProductRepository } =
      await import("./product-repository.horoshop-snapshot");
    cachedRepository = new HoroshopSnapshotProductRepository();
  }

  return cachedRepository;
}

/** Test-only escape hatch — production code never needs to reset the cached repository. */
export function __resetProductRepositoryForTests(): void {
  cachedRepository = null;
}
