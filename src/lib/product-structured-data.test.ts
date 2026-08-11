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
    specEntries: [{ key: "material", label: "Матеріал", value: "Бетон" }],
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
    expect(json.image).toEqual(["/odri-base.jpg"]);
    expect(json.material).toBe("Бетон");
    expect(json.aggregateRating).toBeUndefined();
    expect(json.review).toBeUndefined();
    expect(json.color).toBe("Сірий базовий");
    expect(json.additionalProperty).toBeUndefined();
    expect(json.offers).toMatchObject({
      url: "http://localhost:3000/products/odri",
      priceCurrency: "UAH",
      price: 15150,
      itemCondition: "https://schema.org/NewCondition",
      availability: "https://schema.org/BackOrder",
    });
  });

  it("drops a sku that only repeats the product name, and keeps a real one", () => {
    // Google rejects «sku» when it is the name again, which is how the
    // Horoshop export left roughly half the catalogue. Case and surrounding
    // whitespace must not rescue it: "Circle" and "CIRCLE" are the same
    // non-identifier.
    const same = product({
      name: "CIRCLE",
      base: { ...product().base, sku: " Circle " },
    });
    expect(
      buildProductJsonLd({
        product: same,
        variant: same.base,
        siteUrl: "http://localhost:3000",
        path: "/products/circle",
        brandName: "ODUDLAB",
      }).sku,
    ).toBeUndefined();

    const distinct = product({
      name: "ODRI накладна",
      base: { ...product().base, sku: "Odri n" },
    });
    expect(
      buildProductJsonLd({
        product: distinct,
        variant: distinct.base,
        siteUrl: "http://localhost:3000",
        path: "/products/odri-nakladna",
        brandName: "ODUDLAB",
      }).sku,
    ).toBe("Odri n");
  });

  it("carries the localised category through, and omits it when unset", () => {
    // Google's merchant-listing report flagged a missing `category` on every
    // product page. The value is the caller's already-localised breadcrumb
    // label, so it must be emitted verbatim — not slugged, not translated
    // again here.
    const p = product();
    const withCategory = buildProductJsonLd({
      product: p,
      variant: p.base,
      siteUrl: "http://localhost:3000",
      path: "/products/odri",
      brandName: "ODUDLAB",
      categoryName: "Умивальники",
    });
    expect(withCategory.category).toBe("Умивальники");

    const withoutCategory = buildProductJsonLd({
      product: p,
      variant: p.base,
      siteUrl: "http://localhost:3000",
      path: "/products/odri",
      brandName: "ODUDLAB",
    });
    expect(withoutCategory.category).toBeUndefined();
  });

  it("dedupes images and omits material/color when the data doesn't have them", () => {
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
    expect(json.color).toBeUndefined();
    expect(json.additionalProperty).toBeUndefined();
  });

  it("still finds the material once the spec label is translated (regression)", () => {
    // The lookup used to match `label === "Матеріал"`, so translating the
    // labels for /en and /pl silently dropped `material` from the structured
    // data on exactly the pages that need it most.
    const p = product({
      specEntries: [
        { key: "material", label: "Material", value: "architectural concrete" },
      ],
    });
    const json = buildProductJsonLd({
      product: p,
      variant: p.base,
      siteUrl: "http://localhost:3000",
      path: "/en/products/odri",
      brandName: "ODUDLAB",
    });
    expect(json.material).toBe("architectural concrete");
  });

  it("falls back to the Ukrainian label for legacy entries that carry no key", () => {
    const p = product({
      specEntries: [{ label: "Матеріал", value: "Бетон" }],
    });
    const json = buildProductJsonLd({
      product: p,
      variant: p.base,
      siteUrl: "http://localhost:3000",
      path: "/products/odri",
      brandName: "ODUDLAB",
    });
    expect(json.material).toBe("Бетон");
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
