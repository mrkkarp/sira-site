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

  it("states the one shipping rate it actually knows, and links out for the rest", () => {
    // Google's merchant-listing report wants `shippingDetails`. The only
    // knowable number is the owner's «самовивіз 0 грн»; Нова пошта and кур'єр
    // are «за тарифами перевізника» and must NOT be guessed at, so they live on
    // /payment-delivery behind `shippingSettingsLink` instead of as a second
    // entry with an invented rate.
    const p = product();
    const offers = buildProductJsonLd({
      product: p,
      variant: p.base,
      siteUrl: "http://localhost:3000",
      path: "/en/products/odri",
      brandName: "ODUDLAB",
      pickupLabel: "Free pickup",
      shippingSettingsPath: "/en/payment-delivery",
    }).offers as Record<string, unknown>;

    expect(offers.shippingDetails).toEqual({
      "@type": "OfferShippingDetails",
      shippingLabel: "Free pickup",
      shippingSettingsLink: "http://localhost:3000/en/payment-delivery",
      shippingRate: { "@type": "MonetaryAmount", value: 0, currency: "UAH" },
      shippingDestination: {
        "@type": "DefinedRegion",
        addressCountry: "UA",
      },
      deliveryTime: {
        "@type": "ShippingDeliveryTime",
        // 2–3 weeks of manufacturing, and no carrier leg at all for pickup.
        handlingTime: {
          "@type": "QuantitativeValue",
          minValue: 14,
          maxValue: 21,
          unitCode: "DAY",
        },
        transitTime: {
          "@type": "QuantitativeValue",
          minValue: 0,
          maxValue: 0,
          unitCode: "DAY",
        },
      },
    });
  });

  it("omits the shipping label and settings link rather than hardcoding Ukrainian ones", () => {
    // The label is a translated string that only the caller (which holds the
    // dictionary) can supply. Absent it, the entry must still carry the rate
    // and the destination — dropping the whole of `shippingDetails` would put
    // the merchant-listing warning straight back.
    const p = product();
    const offers = buildProductJsonLd({
      product: p,
      variant: p.base,
      siteUrl: "http://localhost:3000",
      path: "/products/odri",
      brandName: "ODUDLAB",
    }).offers as Record<string, unknown>;
    const shipping = offers.shippingDetails as Record<string, unknown>;

    expect(shipping.shippingLabel).toBeUndefined();
    expect(shipping.shippingSettingsLink).toBeUndefined();
    expect(shipping.shippingRate).toEqual({
      "@type": "MonetaryAmount",
      value: 0,
      currency: "UAH",
    });
  });

  it("reports returns as not permitted, because everything is made to order", () => {
    // The owner's answer, verbatim: «немає. бо вироби виготовляються під
    // замовлення». `MerchantReturnNotPermitted` is the honest schema.org value
    // and is the one category that needs no `merchantReturnDays`/fee fields —
    // there is no return window to describe. Carrier-insured transit damage and
    // manufacturing defects are a different thing entirely and stay in prose on
    // /returns; schema.org cannot express them without overpromising a window.
    const p = product();
    const offers = buildProductJsonLd({
      product: p,
      variant: p.base,
      siteUrl: "http://localhost:3000",
      path: "/products/odri",
      brandName: "ODUDLAB",
    }).offers as Record<string, unknown>;

    expect(offers.hasMerchantReturnPolicy).toEqual({
      "@type": "MerchantReturnPolicy",
      applicableCountry: "UA",
      returnPolicyCategory: "https://schema.org/MerchantReturnNotPermitted",
    });
  });

  it("never emits a sku, however real the source value looks", () => {
    // Google rejects every «sku» this catalogue has, and an audit of all 67
    // export rows showed why: none of them is an article code. Half repeat the
    // name outright ("CIRCLE"); the rest are the name shortened or
    // transliterated ("Odri n" for «ODRI накладна»), which is exactly what
    // Google flagged on /products/odri-nakladna. So the field is dropped
    // wholesale rather than filtered — a rule that "keeps the real ones" has
    // nothing left to keep.
    for (const [name, sku] of [
      ["CIRCLE", " Circle "],
      ["ODRI накладна", "Odri n"],
      ["Горщик з бетону «Циліндр 33»", "33"],
      ["LITTLE SEMI накладна", "copy_Semi"],
    ]) {
      const p = product({ name, base: { ...product().base, sku } });
      expect(
        buildProductJsonLd({
          product: p,
          variant: p.base,
          siteUrl: "http://localhost:3000",
          path: "/products/x",
          brandName: "ODUDLAB",
        }).sku,
      ).toBeUndefined();
    }
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
    // The custom variant carries its own price and photo, but still no sku —
    // "Odri color" is the name again with a suffix, like every other row.
    expect(json.sku).toBeUndefined();
    expect(json.offers).toMatchObject({ price: 18200 });
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
