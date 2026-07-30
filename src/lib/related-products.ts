import type { Product } from "@/lib/schemas/product";

export type RelatedHeadingKey =
  "relatedCompleteTheSet" | "relatedSimilarInShape" | "relatedYouMayAlsoLike";

export interface RelatedProductsSection {
  headingKey: RelatedHeadingKey;
  products: Product[];
}

const MAX_RELATED = 4;

function dedupeBySlug(products: Product[]): Product[] {
  const seen = new Set<string>();
  const result: Product[] = [];
  for (const product of products) {
    if (seen.has(product.slug)) continue;
    seen.add(product.slug);
    result.push(product);
  }
  return result;
}

/**
 * Picks the real related-products rail for a product page — Prompt 6 §13
 * ("You may also like" / "Similar in shape" / "In this colour" / "Complete
 * the set" — not all required; priority: manual > same collection > same
 * category > shared tags > bestseller fallback).
 *
 * Only two of the five priority tiers have real backing data in this
 * project, plus one honest last-resort fallback:
 * - "Manual" curation: no such field exists anywhere in the source export
 *   or `ProductSchema` — not implemented (needs real ODUDLAB data).
 * - "Same collection" -> heading "Complete the set": real, from
 *   `src/data/collections.json` (`demo: true` grouping/story copy, but
 *   genuine product-slug membership) via `getCollectionSlugsForProduct`.
 * - "Same category" -> heading "Similar in shape": real, `shopCategory`.
 * - "Shared tags": no `tags` field exists anywhere — not implemented.
 * - "Bestseller fallback" -> heading "You may also like": there's no real
 *   per-product bestseller flag, so this reuses the same hand-curated,
 *   real `popularProductSlugs` list already used on the homepage, only as
 *   a last resort when neither collection nor category yields a result
 *   (in practice this almost never triggers, since every real category has
 *   more than one product).
 *
 * Pure selection logic only — the caller gathers the real candidate lists
 * from `products.ts`/`collections.ts` and passes them in, so this stays
 * unit-testable without touching real data files. Never returns the
 * current product itself; callers must have already excluded it, but this
 * also filters defensively in case they didn't.
 */
export function pickRelatedProducts({
  currentSlug,
  sameCollection,
  sameCategory,
  bestsellers,
}: {
  currentSlug: string;
  sameCollection: Product[];
  sameCategory: Product[];
  bestsellers: Product[];
}): RelatedProductsSection | undefined {
  const collectionCandidates = dedupeBySlug(sameCollection).filter(
    (product) => product.slug !== currentSlug,
  );
  if (collectionCandidates.length > 0) {
    return {
      headingKey: "relatedCompleteTheSet",
      products: collectionCandidates.slice(0, MAX_RELATED),
    };
  }

  const categoryCandidates = dedupeBySlug(sameCategory).filter(
    (product) => product.slug !== currentSlug,
  );
  if (categoryCandidates.length > 0) {
    return {
      headingKey: "relatedSimilarInShape",
      products: categoryCandidates.slice(0, MAX_RELATED),
    };
  }

  const bestsellerCandidates = dedupeBySlug(bestsellers).filter(
    (product) => product.slug !== currentSlug,
  );
  if (bestsellerCandidates.length > 0) {
    return {
      headingKey: "relatedYouMayAlsoLike",
      products: bestsellerCandidates.slice(0, MAX_RELATED),
    };
  }

  return undefined;
}
