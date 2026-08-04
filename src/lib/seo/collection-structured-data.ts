/**
 * `CollectionPage` + `ItemList` JSON-LD (Prompt 9 §4 — structured data
 * audit) for listing pages: `/shop`, `/[category][/[subcategory]]`, `/collections`,
 * `/collections/[slug]`. Pure/unit-testable, same split as
 * `buildProductJsonLd`/`buildBreadcrumbJsonLd`.
 *
 * `items` must always be the *actual, currently visible* set — e.g. the
 * already-filtered-and-paginated `pageItems` shop pages render, or a real
 * curated collection's product list — never the full unfiltered catalog.
 * That keeps the markup honest: it describes what a crawler/user sees on
 * this exact URL, not a superset invented for SEO padding.
 */
export type CollectionJsonLdItem = {
  name: string;
  path: string;
};

export function buildCollectionPageJsonLd({
  name,
  description,
  siteUrl,
  path,
  items,
  startPosition = 1,
}: {
  name: string;
  description?: string;
  siteUrl: string;
  path: string;
  items: CollectionJsonLdItem[];
  /** 1-based rank of `items[0]` — lets paginated listings report each
   * page's items at their true overall rank rather than restarting at 1. */
  startPosition?: number;
}): Record<string, unknown> {
  const base = siteUrl.replace(/\/$/, "");

  const json: Record<string, unknown> = {
    "@context": "https://schema.org",
    "@type": "CollectionPage",
    name,
    url: `${base}${path}`,
    mainEntity: {
      "@type": "ItemList",
      itemListElement: items.map((item, index) => ({
        "@type": "ListItem",
        position: startPosition + index,
        name: item.name,
        url: `${base}${item.path}`,
      })),
    },
  };

  if (description) {
    json.description = description;
  }

  return json;
}
