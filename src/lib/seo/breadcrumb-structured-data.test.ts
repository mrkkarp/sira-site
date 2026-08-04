import { describe, expect, it } from "vitest";
import { buildBreadcrumbJsonLd } from "./breadcrumb-structured-data";

describe("buildBreadcrumbJsonLd", () => {
  it("builds a positioned ListItem per crumb with absolute URLs", () => {
    const json = buildBreadcrumbJsonLd({
      siteUrl: "https://example.com",
      items: [
        { name: "Головна", path: "/" },
        { name: "Магазин", path: "/shop" },
        { name: "Раковини", path: "/rakovyny" },
      ],
    });

    expect(json).toEqual({
      "@context": "https://schema.org",
      "@type": "BreadcrumbList",
      itemListElement: [
        {
          "@type": "ListItem",
          position: 1,
          name: "Головна",
          item: "https://example.com/",
        },
        {
          "@type": "ListItem",
          position: 2,
          name: "Магазин",
          item: "https://example.com/shop",
        },
        {
          "@type": "ListItem",
          position: 3,
          name: "Раковини",
          item: "https://example.com/rakovyny",
        },
      ],
    });
  });

  it("strips a trailing slash from siteUrl before concatenating paths", () => {
    const json = buildBreadcrumbJsonLd({
      siteUrl: "https://example.com/",
      items: [{ name: "Головна", path: "/" }],
    }) as { itemListElement: Array<{ item: string }> };

    expect(json.itemListElement[0].item).toBe("https://example.com/");
  });
});
