import "server-only";
import type { Product } from "@/lib/schemas/product";
import type { FilterState } from "@/lib/shop-filters";
import {
  computeMountFacet,
  computePlacementFacet,
  computeColourFacet,
  computeCollectionFacet,
} from "@/lib/shop-filters";
import type { ShopFacets } from "@/components/shop/filter-fieldsets";
import {
  getAllCollections,
  getCollectionSlugsForProduct,
} from "@/lib/collections";

/** Shared between the desktop sidebar and mobile drawer's match-count. */
export function collectionMembership(slug: string): string[] {
  return getCollectionSlugsForProduct(slug);
}

function numericBounds(values: number[]): { min: number; max: number } {
  if (values.length === 0) return { min: 0, max: 0 };
  return { min: Math.min(...values), max: Math.max(...values) };
}

/**
 * Assembles the full `ShopFacets` object (options + counts + disabled state
 * + numeric bounds) for a given product set — shared by `/shop` and
 * `/[category]` so the routes don't duplicate this wiring
 * (Prompt 5's "one reusable architecture" requirement).
 */
export function buildShopFacets(
  categoryProducts: Product[],
  filters: FilterState,
): ShopFacets {
  const collections = getAllCollections();
  const collectionFacet = computeCollectionFacet(
    categoryProducts,
    filters,
    collections.map((collection) => collection.slug),
    collectionMembership,
  ).map((option) => ({
    ...option,
    name:
      collections.find((collection) => collection.slug === option.value)
        ?.name ?? option.value,
  }));

  const prices = categoryProducts.flatMap((product) =>
    product.customColour
      ? [product.base.price, product.customColour.price]
      : [product.base.price],
  );
  const widths = categoryProducts
    .map((product) => product.widthCm)
    .filter((value): value is number => value !== undefined);
  const heights = categoryProducts
    .map((product) => product.heightCm)
    .filter((value): value is number => value !== undefined);

  return {
    mount: computeMountFacet(categoryProducts, filters, collectionMembership),
    placement: computePlacementFacet(
      categoryProducts,
      filters,
      collectionMembership,
    ),
    colour: computeColourFacet(categoryProducts, filters, collectionMembership),
    collections: collectionFacet,
    priceBounds: numericBounds(prices),
    widthBounds: widths.length > 0 ? numericBounds(widths) : null,
    heightBounds: heights.length > 0 ? numericBounds(heights) : null,
  };
}
