import { describe, expect, it } from "vitest";
import { ProductId, VariantId, CategoryId, OptionId } from "../shared/ids";
import type { Product } from "./product";
import type { ProductVariant } from "./product-variant";
import {
  buildVariantIndex,
  resolveVariant,
  resolveVariantForProduct,
  effectivePrice,
  isVariantOrderable,
} from "./variant-resolver";

function variant(
  overrides: Partial<ProductVariant> &
    Pick<ProductVariant, "sku" | "selectedOptions">,
): ProductVariant {
  return {
    id: VariantId.parse(overrides.sku),
    productId: ProductId.parse("prod-1"),
    price: { currency: "UAH", minorUnits: 100000 },
    inventory: { status: "madeToOrder" },
    ...overrides,
  };
}

function product(
  overrides: Partial<Product> & Pick<Product, "variants">,
): Product {
  return {
    id: ProductId.parse("prod-1"),
    slug: "prod-1",
    sku: "PROD-1",
    name: { uk: "Тестовий товар" },
    categoryId: CategoryId.parse("cat-1"),
    basePrice: { currency: "UAH", minorUnits: 100000 },
    editorialStatus: "published",
    stockStatus: "madeToOrder",
    ...overrides,
  };
}

describe("buildVariantIndex / resolveVariant — product with no real option axes", () => {
  const noOptionsProduct = product({
    variants: [variant({ sku: "PROD-1", selectedOptions: [] })],
  });

  it("resolves the single default variant even with an empty selection", () => {
    const index = buildVariantIndex(noOptionsProduct);
    const result = resolveVariant(index, {});
    expect(result).toEqual({
      status: "resolved",
      variant: noOptionsProduct.variants[0],
    });
  });

  it("ignores an irrelevant selection key the product doesn't define", () => {
    const result = resolveVariantForProduct(noOptionsProduct, {
      colour: "anything",
    });
    expect(result.status).toBe("resolved");
  });
});

describe("resolveVariant — one required axis (colour)", () => {
  const colourProduct = product({
    options: [
      {
        id: OptionId.parse("opt-colour"),
        key: "colour",
        label: { uk: "Колір" },
        values: [
          { value: "grey", label: { uk: "Сірий" } },
          { value: "white", label: { uk: "Білий" } },
        ],
      },
    ],
    variants: [
      variant({
        sku: "PROD-1-GREY",
        selectedOptions: [{ optionKey: "colour", value: "grey" }],
      }),
      variant({
        sku: "PROD-1-WHITE",
        selectedOptions: [{ optionKey: "colour", value: "white" }],
      }),
    ],
  });

  it("reports the axis as missing when nothing is selected", () => {
    const result = resolveVariantForProduct(colourProduct, {});
    expect(result).toEqual({
      status: "incomplete",
      missingOptionKeys: ["colour"],
    });
  });

  it("resolves the matching variant for a valid selection", () => {
    const result = resolveVariantForProduct(colourProduct, { colour: "grey" });
    expect(result).toEqual({
      status: "resolved",
      variant: colourProduct.variants[0],
    });
  });

  it("treats a value the product doesn't offer as if it were never selected", () => {
    const result = resolveVariantForProduct(colourProduct, {
      colour: "purple",
    });
    expect(result).toEqual({
      status: "incomplete",
      missingOptionKeys: ["colour"],
    });
  });
});

describe("resolveVariant — two axes with an impossible combination", () => {
  const twoAxisProduct = product({
    options: [
      {
        id: OptionId.parse("opt-colour"),
        key: "colour",
        label: { uk: "Колір" },
        values: [
          { value: "grey", label: { uk: "Сірий" } },
          { value: "white", label: { uk: "Білий" } },
        ],
      },
      {
        id: OptionId.parse("opt-size"),
        key: "size",
        label: { uk: "Розмір" },
        values: [
          { value: "S", label: { uk: "S" } },
          { value: "M", label: { uk: "M" } },
        ],
      },
    ],
    variants: [
      variant({
        sku: "PROD-1-GREY-S",
        selectedOptions: [
          { optionKey: "colour", value: "grey" },
          { optionKey: "size", value: "S" },
        ],
      }),
      variant({
        sku: "PROD-1-GREY-M",
        selectedOptions: [
          { optionKey: "colour", value: "grey" },
          { optionKey: "size", value: "M" },
        ],
      }),
    ],
  });

  it("resolves a defined combination regardless of the order options are provided in", () => {
    const bySizeFirst = resolveVariantForProduct(twoAxisProduct, {
      size: "S",
      colour: "grey",
    });
    expect(bySizeFirst).toEqual({
      status: "resolved",
      variant: twoAxisProduct.variants[0],
    });
  });

  it("reports unavailableCombination for a valid-per-axis but never-defined combination", () => {
    const result = resolveVariantForProduct(twoAxisProduct, {
      colour: "white",
      size: "S",
    });
    expect(result).toEqual({
      status: "unavailableCombination",
      selection: { colour: "white", size: "S" },
    });
  });

  it("reports only the still-missing axis when one of two is selected", () => {
    const result = resolveVariantForProduct(twoAxisProduct, { colour: "grey" });
    expect(result).toEqual({
      status: "incomplete",
      missingOptionKeys: ["size"],
    });
  });
});

describe("effectivePrice", () => {
  const base = product({
    variants: [variant({ sku: "PROD-1", selectedOptions: [] })],
  });

  it("uses the variant's own price when set", () => {
    const [v] = base.variants;
    expect(effectivePrice(base, v)).toEqual({
      currency: "UAH",
      minorUnits: 100000,
    });
  });

  it("falls back to the product's basePrice when the variant has no fixed price", () => {
    const v = variant({ sku: "PROD-1", selectedOptions: [], price: null });
    expect(effectivePrice(base, v)).toEqual(base.basePrice);
  });

  it("is null when neither the variant nor the product has a price (quote-only)", () => {
    const quoteOnlyProduct = product({
      basePrice: null,
      variants: [variant({ sku: "PROD-1", selectedOptions: [], price: null })],
    });
    expect(
      effectivePrice(quoteOnlyProduct, quoteOnlyProduct.variants[0]),
    ).toBeNull();
  });
});

describe("isVariantOrderable", () => {
  it("is true for madeToOrder/inStock/availableForOrder", () => {
    expect(
      isVariantOrderable(
        variant({
          sku: "a",
          selectedOptions: [],
          inventory: { status: "inStock" },
        }),
      ),
    ).toBe(true);
  });

  it("is false for unavailable/quoteOnly", () => {
    expect(
      isVariantOrderable(
        variant({
          sku: "a",
          selectedOptions: [],
          inventory: { status: "unavailable", reason: "Немає на складі" },
        }),
      ),
    ).toBe(false);
    expect(
      isVariantOrderable(
        variant({
          sku: "a",
          selectedOptions: [],
          inventory: { status: "quoteOnly" },
        }),
      ),
    ).toBe(false);
  });
});
