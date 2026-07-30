import { describe, expect, it } from "vitest";
import { getProductDocuments } from "@/lib/product-documents";
import type { Product } from "@/lib/schemas/product";

function product(overrides: Partial<Product> = {}): Product {
  return {
    slug: "odri",
    sku: "Odri",
    name: "Odri",
    sourceCategory: "Раковини/Підлогові",
    shopCategory: "sinks",
    specEntries: [],
    base: {
      sku: "Odri",
      price: 15150,
      photo: "/odri-base.jpg",
      description: "",
    },
    ...overrides,
  };
}

describe("getProductDocuments", () => {
  it("returns no documents — there are no real document files in the source data", () => {
    expect(getProductDocuments(product())).toEqual([]);
  });
});
