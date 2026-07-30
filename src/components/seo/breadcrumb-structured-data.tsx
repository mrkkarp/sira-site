import { getSiteUrl } from "@/lib/site-url";
import {
  buildBreadcrumbJsonLd,
  type BreadcrumbJsonLdItem,
} from "@/lib/seo/breadcrumb-structured-data";
import { serializeJsonLd } from "@/lib/json-ld";

/**
 * Renders `BreadcrumbList` JSON-LD (Prompt 9 §4), mirroring
 * `ProductStructuredData`/`HomeStructuredData`'s
 * `<script type="application/ld+json">` pattern. `items` should be the same
 * crumb trail already shown by the page's visual `<Breadcrumbs>`, just with
 * every entry's real absolute path included (see
 * `src/lib/seo/breadcrumb-structured-data.ts`).
 */
export function BreadcrumbStructuredData({
  items,
}: {
  items: BreadcrumbJsonLdItem[];
}) {
  const siteUrl = getSiteUrl().toString();
  const json = buildBreadcrumbJsonLd({ items, siteUrl });

  return (
    <script
      type="application/ld+json"
      dangerouslySetInnerHTML={{ __html: serializeJsonLd(json) }}
    />
  );
}
