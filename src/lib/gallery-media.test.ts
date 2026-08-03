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

  it("appends technical drawings after the photographs, typed as drawings", () => {
    const p = product({
      base: {
        sku: "Odri",
        price: 15150,
        photo: "/odri-1.jpg",
        gallery: ["/odri-1.jpg", "/odri-2.jpg"],
        drawings: ["/odri-dims.jpg"],
        description: "",
      },
    });
    expect(buildGalleryMedia(p, p.base)).toEqual([
      { type: "photo", src: "/odri-1.jpg", alt: "Odri" },
      { type: "photo", src: "/odri-2.jpg", alt: "Odri" },
      { type: "drawing", src: "/odri-dims.jpg", alt: "Odri" },
    ]);
  });

  it("never opens on a drawing, even when it is the only extra image", () => {
    const p = product({
      base: {
        sku: "Odri",
        price: 15150,
        photo: "/odri-1.jpg",
        gallery: ["/odri-1.jpg"],
        drawings: ["/odri-dims.jpg"],
        description: "",
      },
    });
    expect(buildGalleryMedia(p, p.base)[0].type).toBe("photo");
  });

  it("falls back to the base drawings for a variant that has none of its own", () => {
    const p = product({
      base: {
        sku: "Odri",
        price: 15150,
        photo: "/odri-1.jpg",
        gallery: ["/odri-1.jpg"],
        drawings: ["/odri-dims.jpg"],
        description: "",
      },
    });
    const media = buildGalleryMedia(p, {
      ...p.base,
      gallery: ["/odri-custom.jpg"],
      drawings: undefined,
    });
    expect(media).toEqual([
      { type: "photo", src: "/odri-custom.jpg", alt: "Odri" },
      { type: "drawing", src: "/odri-dims.jpg", alt: "Odri" },
    ]);
  });
});
