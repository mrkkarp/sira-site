import { describe, expect, it } from "vitest";
import { buildProductJsonLd } from "@/lib/product-structured-data";
import type { Product } from "@/lib/schemas/product";

function product(overrides: Partial<Product> = {}): Product {
  return {
    slug: "odri",
    sku: "Odri",
    name: "Odri",
    sourceCategory: "Раковини/Підлогові",
    shopCategory: "sinks",
    specEntries: [{ label: "Матеріал", value: "Бетон" }],
    base: {
      sku: "Odri",
      colorLabel: "Сірий базовий",
      price: 15150,
      photo: "/odri-base.jpg",
      description: "Odri opis.",
    },
    ...overrides,
  };
}

describe("buildProductJsonLd", () => {
  it("builds honest Product JSON-LD from the base variant, with no aggregateRating", () => {
    const p = product();
    const json = buildProductJsonLd({
      product: p,
      variant: p.base,
      siteUrl: "http://localhost:3000",
      path: "/products/odri",
      brandName: "ODUDLAB",
    });
    expect(json["@type"]).toBe("Product");
    expect(json.name).toBe("Odri");
    expect(json.description).toBe("Odri opis.");
    expect(json.sku).toBe("Odri");
    expect(json.image).toEqual(["/odri-base.jpg"]);
    expect(json.material).toBe("Бетон");
    expect(json.aggregateRating).toBeUndefined();
    expect(json.review).toBeUndefined();
    expect(json.additionalProperty).toEqual([
      { "@type": "PropertyValue", name: "Колір", value: "Сірий базовий" },
    ]);
    expect(json.offers).toMatchObject({
      url: "http://localhost:3000/products/odri",
      priceCurrency: "UAH",
      price: 15150,
      itemCondition: "https://schema.org/NewCondition",
      availability: "https://schema.org/BackOrder",
    });
  });

  it("dedupes images and omits material/additionalProperty when the data doesn't have them", () => {
    const p = product({
      specEntries: [],
      base: { sku: "SOLO", price: 9000, photo: "/solo.jpg", description: "" },
    });
    const json = buildProductJsonLd({
      product: p,
      variant: p.base,
      siteUrl: "http://localhost:3000/",
      path: "/products/solo",
      brandName: "ODUDLAB",
    });
    expect(json.image).toEqual(["/solo.jpg"]);
    expect(json.material).toBeUndefined();
    expect(json.additionalProperty).toBeUndefined();
  });

  it("includes the custom-colour photo alongside the base photo when selecting the custom variant", () => {
    const p = product({
      customColour: {
        sku: "Odri color",
        colorLabel: "Свій колір",
        price: 18200,
        photo: "/odri-custom.jpg",
        description: "",
      },
    });
    const json = buildProductJsonLd({
      product: p,
      variant: p.customColour!,
      siteUrl: "http://localhost:3000",
      path: "/products/odri",
      brandName: "ODUDLAB",
    });
    expect(json.image).toEqual(["/odri-custom.jpg", "/odri-base.jpg"]);
    expect(json.sku).toBe("Odri color");
  });

  it("strips the trailing 'Характеристики' spec dump out of the JSON-LD description", () => {
    const p = product({
      base: {
        sku: "Odri",
        colorLabel: "Сірий базовий",
        price: 15150,
        photo: "/odri-base.jpg",
        description: "Odri opis.\nХарактеристики\n-\nМатеріал: бетон",
      },
    });
    const json = buildProductJsonLd({
      product: p,
      variant: p.base,
      siteUrl: "http://localhost:3000",
      path: "/products/odri",
      brandName: "ODUDLAB",
    });
    expect(json.description).toBe("Odri opis.");
  });
});
