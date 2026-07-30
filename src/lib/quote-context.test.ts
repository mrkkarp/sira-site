import { describe, expect, it } from "vitest";
import { buildQuoteContext } from "@/lib/quote-context";
import type { Product, ProductVariant } from "@/lib/schemas/product";

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

describe("buildQuoteContext", () => {
  it("includes the real SKU and colour label", () => {
    const variant: ProductVariant = {
      sku: "Odri color",
      colorLabel: "Свій колір",
      price: 18200,
      photo: "/odri-base.jpg",
      description: "",
    };
    expect(buildQuoteContext(product(), variant)).toBe(
      "Odri (Odri color), колір: Свій колір",
    );
  });

  it("omits the colour clause when the variant has no colour label", () => {
    const variant: ProductVariant = {
      sku: "Odri",
      price: 15150,
      photo: "/odri-base.jpg",
      description: "",
    };
    expect(buildQuoteContext(product(), variant)).toBe("Odri (Odri)");
  });
});
