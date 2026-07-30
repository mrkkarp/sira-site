import { describe, expect, it } from "vitest";
import { mapSnapshotProductToDomain } from "./product-repository.horoshop-snapshot";
import type { Product as LegacyProduct } from "@/lib/schemas/product";

const baseVariant: LegacyProduct["base"] = {
  sku: "Odri",
  colorLabel: "Сірий базовий",
  price: 4500,
  photo: "https://example.com/odri.jpg",
  description: "Базовий опис товару.",
  leadTimeWeeks: 3,
  mayBeOutOfStock: true,
};

const legacyProduct: LegacyProduct = {
  slug: "odri-60",
  sku: "Odri",
  name: "Odri 60",
  sourceCategory: "Раковини/Підлогові",
  shopCategory: "sinks",
  sinkType: "freestanding",
  heightCm: 85,
  widthCm: 60,
  specEntries: [{ label: "Матеріал", value: "Бетон" }],
  base: baseVariant,
};

describe("mapSnapshotProductToDomain", () => {
  it("maps the base variant, specs and price", () => {
    const product = mapSnapshotProductToDomain(legacyProduct);

    expect(product.id).toBe("odri-60");
    expect(product.slug).toBe("odri-60");
    expect(product.sku).toBe("Odri");
    expect(product.name).toEqual({ uk: "Odri 60" });
    expect(product.categoryId).toBe("sinks");
    expect(product.basePrice).toEqual({ currency: "UAH", minorUnits: 450000 });
    expect(product.editorialStatus).toBe("published");
    expect(product.stockStatus).toBe("madeToOrder");
    expect(product.mainMediaId).toBeUndefined();
    expect(product.legacy).toBeUndefined();
  });

  it("derives specifications from sinkType/heightCm/widthCm/specEntries", () => {
    const product = mapSnapshotProductToDomain(legacyProduct);
    expect(product.specifications).toEqual([
      {
        kind: "text",
        key: "sinkType",
        label: { uk: "Тип монтажу" },
        value: { uk: "freestanding" },
      },
      {
        kind: "measurement",
        key: "heightCm",
        label: { uk: "Висота" },
        value: 85,
        unit: "cm",
      },
      {
        kind: "measurement",
        key: "widthCm",
        label: { uk: "Ширина" },
        value: 60,
        unit: "cm",
      },
      {
        kind: "text",
        key: "legacySpec0",
        label: { uk: "Матеріал" },
        value: { uk: "Бетон" },
      },
    ]);
  });

  it("maps the base variant's lead time and out-of-stock note", () => {
    const product = mapSnapshotProductToDomain(legacyProduct);
    const [variant] = product.variants;
    expect(variant.id).toBe("Odri");
    expect(variant.sku).toBe("Odri");
    expect(variant.selectedOptions).toEqual([
      { optionKey: "colour", value: "Сірий базовий" },
    ]);
    expect(variant.price).toEqual({ currency: "UAH", minorUnits: 450000 });
    expect(variant.leadTime).toEqual({ minDays: 21, maxDays: 21 });
    expect(variant.stockNote).toEqual({
      uk: "Можлива тимчасова відсутність — уточнюйте.",
    });
  });

  it("adds a second variant when customColour is present", () => {
    const withCustom: LegacyProduct = {
      ...legacyProduct,
      customColour: {
        sku: "Odri color",
        colorLabel: "Свій колір",
        price: 4900,
        photo: "https://example.com/odri-custom.jpg",
        description: "Кастомний колір.",
      },
    };
    const product = mapSnapshotProductToDomain(withCustom);
    expect(product.variants).toHaveLength(2);
    expect(product.variants[1].sku).toBe("Odri color");
    expect(product.variants[1].leadTime).toBeUndefined();
    expect(product.variants[1].stockNote).toBeUndefined();
  });

  it("omits specifications entirely when none apply", () => {
    const minimal: LegacyProduct = {
      slug: "plain-table",
      sku: "Plain",
      name: "Plain table",
      sourceCategory: "Столи",
      shopCategory: "tables",
      specEntries: [],
      base: {
        sku: "Plain",
        price: 1000,
        photo: "https://example.com/plain.jpg",
        description: "",
      },
    };
    const product = mapSnapshotProductToDomain(minimal);
    expect(product.specifications).toBeUndefined();
    expect(product.shortDescription).toBeUndefined();
    expect(product.variants[0].selectedOptions).toEqual([]);
  });
});
