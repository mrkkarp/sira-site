import { getSiteUrl } from "@/lib/site-url";
import {
  buildCollectionPageJsonLd,
  type CollectionJsonLdItem,
} from "@/lib/seo/collection-structured-data";
import { serializeJsonLd } from "@/lib/json-ld";

/**
 * Renders `CollectionPage` + `ItemList` JSON-LD (Prompt 9 §4) for listing
 * pages (`/shop`, `/[category][/[subcategory]]`, `/collections`,
 * `/collections/[slug]`).
 * Same rendering pattern as `BreadcrumbStructuredData`/`ProductStructuredData`.
 */
export function CollectionStructuredData({
  name,
  description,
  path,
  items,
  startPosition,
}: {
  name: string;
  description?: string;
  path: string;
  items: CollectionJsonLdItem[];
  startPosition?: number;
}) {
  const siteUrl = getSiteUrl().toString();
  const json = buildCollectionPageJsonLd({
    name,
    description,
    siteUrl,
    path,
    items,
    startPosition,
  });

  return (
    <script
      type="application/ld+json"
      dangerouslySetInnerHTML={{ __html: serializeJsonLd(json) }}
    />
  );
}
