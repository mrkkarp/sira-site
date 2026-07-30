/**
 * `BreadcrumbList` JSON-LD (Prompt 9 §4 — structured data audit). Pure/
 * unit-testable, mirroring `buildProductJsonLd`'s split between a pure
 * builder here and a thin rendering component
 * (`src/components/seo/breadcrumb-structured-data.tsx`).
 *
 * Every item is real: callers pass the exact same crumb trail already shown
 * on-page via `<Breadcrumbs>` (see `src/components/ui/breadcrumbs.tsx`), just
 * with every position's absolute path included — including the current
 * page, which schema.org's `BreadcrumbList` expects as the final `ListItem`
 * even though the visual breadcrumb renders it as unlinked text.
 */
export type BreadcrumbJsonLdItem = {
  name: string;
  path: string;
};

export function buildBreadcrumbJsonLd({
  items,
  siteUrl,
}: {
  items: BreadcrumbJsonLdItem[];
  siteUrl: string;
}): Record<string, unknown> {
  const base = siteUrl.replace(/\/$/, "");

  return {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: items.map((item, index) => ({
      "@type": "ListItem",
      position: index + 1,
      name: item.name,
      item: `${base}${item.path}`,
    })),
  };
}
