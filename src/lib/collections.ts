import "server-only";
import { z } from "zod";
import rawCollections from "@/data/collections.json";
import { CollectionSchema, type Collection } from "@/lib/schemas/collection";
import { getAllProducts } from "@/lib/products";
import type { Product } from "@/lib/schemas/product";

const CollectionFileSchema = z.array(CollectionSchema);

let cached: Collection[] | null = null;

/**
 * Curated demo collections (`src/data/collections.json`) — real product
 * slugs and real photography, but the grouping/story copy is an honest
 * editorial placeholder (`demo: true`) until ODUDLAB provides real named
 * collections. See IMAGE_REQUIREMENTS.md / the homepage testimonials for the
 * same demo-labeling convention used elsewhere in this project.
 */
export function getAllCollections(): Collection[] {
  if (!cached) {
    cached = CollectionFileSchema.parse(rawCollections);
  }
  return cached;
}

export function getCollectionBySlug(slug: string): Collection | undefined {
  return getAllCollections().find((collection) => collection.slug === slug);
}

/** Real products belonging to a collection — silently drops any
 * `productSlugs` entry that no longer matches a real product rather than
 * throwing (source data can change independently of collections.json). */
export function getCollectionProducts(collection: Collection): Product[] {
  const bySlug = new Map(
    getAllProducts().map((product) => [product.slug, product]),
  );
  return collection.productSlugs
    .map((slug) => bySlug.get(slug))
    .filter((product): product is Product => Boolean(product));
}

/** Which collection slugs a given product slug belongs to — used by the
 * shop filter engine's `collection` facet. */
export function getCollectionSlugsForProduct(productSlug: string): string[] {
  return getAllCollections()
    .filter((collection) => collection.productSlugs.includes(productSlug))
    .map((collection) => collection.slug);
}
