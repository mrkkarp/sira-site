import type { Locale } from "@/i18n/config";
import { getSiteUrl } from "@/lib/site-url";
import { buildContactPageJsonLd } from "@/lib/seo/organization-json-ld";
import { serializeJsonLd } from "@/lib/json-ld";

/**
 * Renders `ContactPage` JSON-LD with the business as its `mainEntity`. Same
 * rendering pattern as `BreadcrumbStructuredData`/`CollectionStructuredData`:
 * the shape is built by a pure, tested function in `src/lib/seo/`, and this
 * only puts it on the page.
 */
export function ContactPageStructuredData({
  locale,
  path,
  name,
  description,
  siteName,
}: {
  locale: Locale;
  path: string;
  name: string;
  description: string;
  siteName: string;
}) {
  const json = buildContactPageJsonLd({
    siteUrl: getSiteUrl().toString(),
    path,
    name,
    description,
    siteName,
    locale,
  });

  return (
    <script
      type="application/ld+json"
      dangerouslySetInnerHTML={{ __html: serializeJsonLd(json) }}
    />
  );
}
