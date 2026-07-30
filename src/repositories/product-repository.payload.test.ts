import { describe, expect, it } from "vitest";
import { mapPayloadProductToDomain } from "./product-repository.payload";
import type { Product as PayloadProduct } from "@/payload-types";

/**
 * Locale-bearing fields (`name`, `shortDescription`, `specs.material`, ...)
 * are typed as plain `string` by Payload's generator, but at runtime — via
 * this repository's `locale: "all"` query — actually come back as
 * `{ uk, en?, pl? }`. Casting through `unknown` here mirrors exactly what
 * `getPayloadClient()`'s real query result looks like; see `./locale-all.ts`.
 */
function localised(uk: string, en?: string): string {
  return { uk, en } as unknown as string;
}

const baseDoc: PayloadProduct = {
  id: 42,
  name: localised("Одрі 60", "Odri 60"),
  slug: "odri-60",
  sku: "ODRI-60",
  category: 7,
  editorialStatus: "published",
  stockStatus: "madeToOrder",
  basePrice: 4500,
  specs: {
    material: localised("Бетон"),
    height: { value: 85, unit: "cm" },
  },
  variants: [
    {
      id: "row-1",
      sku: "ODRI-60-GREY",
      optionAxes: { colour: 3 },
      price: 4500,
      status: "madeToOrder",
    },
  ],
  updatedAt: "2026-01-01T00:00:00.000Z",
  createdAt: "2026-01-01T00:00:00.000Z",
};

describe("mapPayloadProductToDomain", () => {
  it("maps id/slug/category/price from bare relationship ids", () => {
    const product = mapPayloadProductToDomain(baseDoc);
    expect(product.id).toBe("42");
    expect(product.slug).toBe("odri-60");
    expect(product.categoryId).toBe("7");
    expect(product.name).toEqual({ uk: "Одрі 60", en: "Odri 60" });
    expect(product.basePrice).toEqual({ currency: "UAH", minorUnits: 450000 });
  });

  it("maps specs from the specs group, filtering out unset fields", () => {
    const product = mapPayloadProductToDomain(baseDoc);
    expect(product.specifications).toEqual([
      {
        kind: "text",
        key: "material",
        label: { uk: "Матеріал" },
        value: { uk: "Бетон" },
      },
      {
        kind: "measurement",
        key: "height",
        label: { uk: "Висота" },
        value: 85,
        unit: "cm",
      },
    ]);
  });

  it("maps variant rows, using the row's colour relationship id as the colour option value", () => {
    const product = mapPayloadProductToDomain(baseDoc);
    expect(product.variants).toHaveLength(1);
    const [variant] = product.variants;
    expect(variant.id).toBe("row-1");
    expect(variant.sku).toBe("ODRI-60-GREY");
    expect(variant.selectedOptions).toEqual([
      { optionKey: "colour", value: "3" },
    ]);
    expect(variant.price).toEqual({ currency: "UAH", minorUnits: 450000 });
  });

  it("synthesizes a single default variant when the product has no variant rows", () => {
    const product = mapPayloadProductToDomain({ ...baseDoc, variants: [] });
    expect(product.variants).toHaveLength(1);
    expect(product.variants[0].sku).toBe(baseDoc.sku);
    expect(product.variants[0].selectedOptions).toEqual([]);
  });

  it("leaves mainMediaId/galleryMediaIds/documentIds/legacy unset when absent", () => {
    const product = mapPayloadProductToDomain(baseDoc);
    expect(product.mainMediaId).toBeNull();
    expect(product.galleryMediaIds).toBeUndefined();
    expect(product.documentIds).toBeUndefined();
    expect(product.legacy).toBeUndefined();
  });
});
