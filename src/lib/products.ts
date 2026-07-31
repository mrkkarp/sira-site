import "server-only";
import { cache } from "react";
import rawSource from "@/data/products.source.json";
import {
  ProductSourceFileSchema,
  type Product,
  type ShopCategory,
} from "@/lib/schemas/product";
import { groupProductSourceRows } from "@/lib/product-grouping";
import { loadPayloadFlatProducts } from "@/lib/payload-flat-products";

/**
 * Presentation catalog loader. Returns presentation-ready `Product` records
 * (one per colour-variant pair) in the exact shape every storefront render
 * path consumes — regardless of whether the catalog is read from the live
 * Payload/Postgres database or the bundled Horoshop snapshot.
 *
 * `CATALOG_SOURCE` selects the backing store (owner directive #6/#7):
 *  - `payload`  → the real Postgres catalog the Horoshop importer wrote, so
 *    edits made in the admin (descriptions, prices, photos, stock) appear on
 *    the site after revalidation. Reading it needs an async DB round-trip, so
 *    callers must `await preloadProducts()` once at the top of the request
 *    (route handler / page / API route) before any sync accessor runs.
 *  - anything else (default) → the static `products.source.json` snapshot,
 *    read synchronously off disk, exactly as before. Kept as the temporary
 *    fallback the owner asked to retain (#7).
 *
 * The synchronous accessors (`getAllProducts`/`getProductsByCategory`/
 * `getProductBySlug`) are deliberately kept sync so the ~15 downstream
 * consumers (collections, facets, filters, related-products, search,
 * variant-model, structured-data…) don't all have to become async. They read
 * from a **per-request** holder (`react`'s `cache()` gives one instance per
 * request, a fresh one next request) — so admin edits are picked up on the
 * next request/regeneration rather than cached process-wide forever, which is
 * what makes `revalidatePath` (see `Products` collection hooks) actually work.
 */

/** One mutable holder per request (React `cache()` memoizes by args; no args
 * → a single instance per request). Populated by `preloadProducts()` (async,
 * for the Payload path) or lazily/synchronously (snapshot path). */
const requestStore = cache((): { products: Product[] | null } => ({
  products: null,
}));

function loadSnapshot(): Product[] {
  const rows = ProductSourceFileSchema.parse(rawSource satisfies unknown[]);
  return groupProductSourceRows(rows);
}

function usePayloadSource(): boolean {
  return process.env.CATALOG_SOURCE === "payload";
}

/**
 * Warms this request's product cache. **Must be awaited** before any of the
 * sync accessors below when `CATALOG_SOURCE=payload` (the DB read can't
 * happen inside a synchronous accessor). A no-op if already warmed, and cheap
 * (snapshot path) when Payload isn't the source. Every storefront entrypoint
 * that reads products calls this first.
 */
export async function preloadProducts(): Promise<void> {
  const store = requestStore();
  if (store.products) return;
  store.products = usePayloadSource() ? await loadPayloadFlatProducts() : loadSnapshot();
}

/**
 * Async catalog read for callers that run **outside** a React Server
 * Component render — `sitemap()` and route handlers (`app/api/**`). There,
 * React's `cache()` request scope isn't shared between an `await
 * preloadProducts()` and a later sync accessor (each `cache()` call returns a
 * fresh holder), so those callers can't rely on the sync accessors. This
 * loads (and memoizes within the scope, when there is one) and returns the
 * array directly. RSC pages should keep using `preloadProducts()` + the sync
 * accessors.
 */
export async function getAllProductsAsync(): Promise<Product[]> {
  const store = requestStore();
  if (store.products) return store.products;
  const products = usePayloadSource()
    ? await loadPayloadFlatProducts()
    : loadSnapshot();
  store.products = products;
  return products;
}

export function getAllProducts(): Product[] {
  const store = requestStore();
  if (store.products) return store.products;

  if (usePayloadSource()) {
    // The Payload catalog can only be read asynchronously — a sync accessor
    // reaching here means the entrypoint forgot `await preloadProducts()`.
    // Fail loudly (caught in build/smoke) rather than silently serving an
    // empty or stale catalog.
    throw new Error(
      "getAllProducts() called before preloadProducts() with CATALOG_SOURCE=payload — await preloadProducts() at the top of the request first.",
    );
  }

  // Snapshot path: static disk read, safe to warm synchronously on demand.
  store.products = loadSnapshot();
  return store.products;
}

export function getProductsByCategory(category: ShopCategory): Product[] {
  return getAllProducts().filter(
    (product) => product.shopCategory === category,
  );
}

export function getProductBySlug(slug: string): Product | undefined {
  return getAllProducts().find((product) => product.slug === slug);
}
