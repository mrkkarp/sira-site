import { describe, expect, it } from "vitest";
import { buildCollectionPageJsonLd } from "./collection-structured-data";

describe("buildCollectionPageJsonLd", () => {
  it("builds a CollectionPage with a positioned ItemList", () => {
    const json = buildCollectionPageJsonLd({
      siteUrl: "https://example.com",
      name: "Раковини",
      description: "Раковини з декоративного бетону.",
      path: "/shop/sinks",
      items: [
        { name: "Раковина Alfa", path: "/products/alfa" },
        { name: "Раковина Beta", path: "/products/beta" },
      ],
    });

    expect(json).toEqual({
      "@context": "https://schema.org",
      "@type": "CollectionPage",
      name: "Раковини",
      description: "Раковини з декоративного бетону.",
      url: "https://example.com/shop/sinks",
      mainEntity: {
        "@type": "ItemList",
        itemListElement: [
          {
            "@type": "ListItem",
            position: 1,
            name: "Раковина Alfa",
            url: "https://example.com/products/alfa",
          },
          {
            "@type": "ListItem",
            position: 2,
            name: "Раковина Beta",
            url: "https://example.com/products/beta",
          },
        ],
      },
    });
  });

  it("omits description when not provided", () => {
    const json = buildCollectionPageJsonLd({
      siteUrl: "https://example.com",
      name: "Колекції",
      path: "/collections",
      items: [],
    });

    expect(json).not.toHaveProperty("description");
  });

  it("offsets positions by startPosition for paginated listings", () => {
    const json = buildCollectionPageJsonLd({
      siteUrl: "https://example.com",
      name: "Раковини",
      path: "/shop/sinks",
      items: [{ name: "Раковина Gamma", path: "/products/gamma" }],
      startPosition: 13,
    }) as { mainEntity: { itemListElement: Array<{ position: number }> } };

    expect(json.mainEntity.itemListElement[0].position).toBe(13);
  });
});
