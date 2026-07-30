import { describe, expect, it } from "vitest";
import { pickRelatedProducts } from "@/lib/related-products";
import type { Product } from "@/lib/schemas/product";

function product(slug: string, overrides: Partial<Product> = {}): Product {
  return {
    slug,
    sku: slug.toUpperCase(),
    name: slug,
    sourceCategory: "Раковини/Підлогові",
    shopCategory: "sinks",
    specEntries: [],
    base: {
      sku: slug.toUpperCase(),
      price: 1000,
      photo: `/${slug}.jpg`,
      description: "",
    },
    ...overrides,
  };
}

describe("pickRelatedProducts", () => {
  it("prefers the same-collection tier when it has candidates", () => {
    const result = pickRelatedProducts({
      currentSlug: "odri",
      sameCollection: [product("solo"), product("mira")],
      sameCategory: [product("kato")],
      bestsellers: [product("neo")],
    });
    expect(result?.headingKey).toBe("relatedCompleteTheSet");
    expect(result?.products.map((p) => p.slug)).toEqual(["solo", "mira"]);
  });

  it("falls back to the same-category tier when the collection tier is empty", () => {
    const result = pickRelatedProducts({
      currentSlug: "odri",
      sameCollection: [],
      sameCategory: [product("kato")],
      bestsellers: [product("neo")],
    });
    expect(result?.headingKey).toBe("relatedSimilarInShape");
    expect(result?.products.map((p) => p.slug)).toEqual(["kato"]);
  });

  it("falls back to the bestseller tier when both real tiers are empty", () => {
    const result = pickRelatedProducts({
      currentSlug: "odri",
      sameCollection: [],
      sameCategory: [],
      bestsellers: [product("neo")],
    });
    expect(result?.headingKey).toBe("relatedYouMayAlsoLike");
    expect(result?.products.map((p) => p.slug)).toEqual(["neo"]);
  });

  it("returns undefined when no tier has any candidates", () => {
    const result = pickRelatedProducts({
      currentSlug: "odri",
      sameCollection: [],
      sameCategory: [],
      bestsellers: [],
    });
    expect(result).toBeUndefined();
  });

  it("never includes the current product, even if a tier's candidate list forgot to exclude it", () => {
    const result = pickRelatedProducts({
      currentSlug: "odri",
      sameCollection: [product("odri"), product("solo")],
      sameCategory: [],
      bestsellers: [],
    });
    expect(result?.products.map((p) => p.slug)).toEqual(["solo"]);
  });

  it("dedupes by slug within a tier", () => {
    const result = pickRelatedProducts({
      currentSlug: "odri",
      sameCollection: [product("solo"), product("solo")],
      sameCategory: [],
      bestsellers: [],
    });
    expect(result?.products.map((p) => p.slug)).toEqual(["solo"]);
  });

  it("caps each tier at 4 products", () => {
    const result = pickRelatedProducts({
      currentSlug: "odri",
      sameCollection: [
        product("a"),
        product("b"),
        product("c"),
        product("d"),
        product("e"),
      ],
      sameCategory: [],
      bestsellers: [],
    });
    expect(result?.products).toHaveLength(4);
    expect(result?.products.map((p) => p.slug)).toEqual(["a", "b", "c", "d"]);
  });
});
