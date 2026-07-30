import { describe, expect, it } from "vitest";
import { buildGalleryMedia } from "@/lib/gallery-media";
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
      gallery: ["/odri-base.jpg"],
      description: "",
    },
    ...overrides,
  };
}

describe("buildGalleryMedia", () => {
  it("returns every real photo in the variant's gallery, in source order", () => {
    const p = product({
      base: {
        sku: "Odri",
        price: 15150,
        photo: "/odri-1.jpg",
        gallery: ["/odri-1.jpg", "/odri-2.jpg", "/odri-3.jpg"],
        description: "",
      },
    });
    const media = buildGalleryMedia(p, p.base);
    expect(media).toEqual([
      { type: "photo", src: "/odri-1.jpg", alt: "Odri" },
      { type: "photo", src: "/odri-2.jpg", alt: "Odri" },
      { type: "photo", src: "/odri-3.jpg", alt: "Odri" },
    ]);
  });

  it("uses the resolved variant's own real photo", () => {
    const p = product();
    const media = buildGalleryMedia(p, p.base);
    expect(media).toEqual([
      { type: "photo", src: "/odri-base.jpg", alt: "Odri" },
    ]);
  });

  it("falls back to the base gallery when the variant has none", () => {
    const p = product();
    const media = buildGalleryMedia(p, {
      ...p.base,
      photo: "",
      gallery: [],
    });
    expect(media[0].src).toBe("/odri-base.jpg");
  });
});
