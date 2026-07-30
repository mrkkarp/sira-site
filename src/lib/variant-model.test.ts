import { describe, expect, it } from "vitest";
import {
  buildVariantModel,
  resolveVariant,
  variantSelectionKey,
} from "@/lib/variant-model";
import type { Product } from "@/lib/schemas/product";

function product(overrides: Partial<Product> = {}): Product {
  return {
    slug: "odri",
    sku: "Odri",
    name: "Odri",
    sourceCategory: "Раковини/Підлогові",
    shopCategory: "sinks",
    sinkType: "freestanding",
    specEntries: [],
    base: {
      sku: "Odri",
      colorLabel: "Сірий базовий",
      price: 15150,
      photo: "/odri-base.jpg",
      description: "base desc",
      leadTimeWeeks: 2,
    },
    customColour: {
      sku: "Odri color",
      colorLabel: "Свій колір",
      price: 17150,
      photo: "/odri-custom.jpg",
      description: "custom desc",
      leadTimeWeeks: 2,
      mayBeOutOfStock: true,
    },
    ...overrides,
  };
}

describe("variantSelectionKey", () => {
  it("is stable regardless of key insertion order", () => {
    expect(variantSelectionKey({ colour: "base", mount: "freestanding" })).toBe(
      variantSelectionKey({ mount: "freestanding", colour: "base" }),
    );
  });

  it("drops empty/nullish entries", () => {
    expect(variantSelectionKey({ colour: "" })).toBe("");
  });
});

describe("buildVariantModel", () => {
  it("produces a colour option with real labels when a custom-colour row exists", () => {
    const model = buildVariantModel(product());
    expect(model.options).toHaveLength(1);
    expect(model.options[0]).toMatchObject({
      id: "colour",
      required: true,
      choices: [
        { id: "base", label: "Сірий базовий" },
        { id: "custom", label: "Свій колір" },
      ],
    });
    expect(model.defaultSelection).toEqual({ colour: "base" });
  });

  it("produces zero options for a single-variant product (nothing to choose)", () => {
    const model = buildVariantModel(product({ customColour: undefined }));
    expect(model.options).toEqual([]);
    expect(model.defaultSelection).toEqual({});
  });
});

describe("resolveVariant", () => {
  it("resolves the default (base) variant when nothing is selected", () => {
    const model = buildVariantModel(product());
    const result = resolveVariant(model, {});
    expect(result.isComplete).toBe(true);
    expect(result.variant?.sku).toBe("Odri");
    expect(result.variant?.price).toBe(15150);
    expect(result.variant?.leadTimeWeeks).toBe(2);
    expect(result.variant?.mayBeOutOfStock).toBeUndefined();
  });

  it("resolves the custom-colour variant, updating price/SKU/stock together", () => {
    const model = buildVariantModel(product());
    const result = resolveVariant(model, { colour: "custom" });
    expect(result.isComplete).toBe(true);
    expect(result.variant?.sku).toBe("Odri color");
    expect(result.variant?.price).toBe(17150);
    expect(result.variant?.mayBeOutOfStock).toBe(true);
  });

  it("blocks an impossible/unknown choice id instead of crashing, and reports it", () => {
    const model = buildVariantModel(product());
    const result = resolveVariant(model, { colour: "neon-pink" });
    expect(result.invalidOptionIds).toEqual(["colour"]);
    // Falls back to the real default rather than an invalid state.
    expect(result.isComplete).toBe(true);
    expect(result.variant?.sku).toBe("Odri");
  });

  it("does not reset a previously-compatible selection when given an unrelated/unknown extra key", () => {
    const model = buildVariantModel(product());
    const result = resolveVariant(model, { colour: "custom", size: "xl" });
    // "size" isn't a real option for this product — ignored, not an error,
    // and it must not disturb the valid "colour" selection.
    expect(result.selection.colour).toBe("custom");
    expect(result.isComplete).toBe(true);
    expect(result.variant?.sku).toBe("Odri color");
  });

  it("reports a missing required selection rather than guessing, for a hypothetical required-but-unselected option", () => {
    const model = buildVariantModel(product());
    // Simulate a required option with no default (defaultSelection cleared)
    // to exercise the missing-selection path directly.
    const strictModel = { ...model, defaultSelection: {} };
    const result = resolveVariant(strictModel, {});
    expect(result.isComplete).toBe(false);
    expect(result.missingOptionIds).toEqual(["colour"]);
    expect(result.variant).toBeUndefined();
  });

  it("resolves a single-variant product with no options at all", () => {
    const model = buildVariantModel(product({ customColour: undefined }));
    const result = resolveVariant(model, {});
    expect(result.isComplete).toBe(true);
    expect(result.variant?.sku).toBe("Odri");
  });
});
