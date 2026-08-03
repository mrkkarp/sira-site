import type { Locale } from "@/i18n/config";
import type { Dictionary } from "@/i18n/get-dictionary";
import { getSiteUrl } from "@/lib/site-url";
import { buildOrganizationJsonLd } from "@/lib/seo/organization-json-ld";
import { serializeJsonLd } from "@/lib/json-ld";

/**
 * Organization + WebSite JSON-LD for the homepage (Prompt 4 §14). Only uses
 * data already confirmed elsewhere in the codebase (`src/config/contact.ts`,
 * `dictionary.site`) — no invented founding date, employee count, or social
 * profile that isn't in `contact.ts`.
 *
 * The `Organization` shape itself moved to `src/lib/seo/organization-json-ld.ts`
 * when `/contact` gained structured data of its own: the two pages describe the
 * same business, and two hand-maintained copies of one entity is how they drift
 * apart. Sharing the builder also gives both the same `@id`, which is what
 * tells a consumer this is one node described twice and not two companies that
 * happen to share a name.
 */
export function HomeStructuredData({
  locale,
  dictionary,
}: {
  locale: Locale;
  dictionary: Dictionary;
}) {
  const siteUrl = getSiteUrl().toString().replace(/\/$/, "");

  const organization = {
    "@context": "https://schema.org",
    ...buildOrganizationJsonLd({ siteUrl, name: dictionary.site.name }),
  };

  const website = {
    "@context": "https://schema.org",
    "@type": "WebSite",
    name: dictionary.site.name,
    url: siteUrl,
    inLanguage: locale,
  };

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: serializeJsonLd(organization) }}
      />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: serializeJsonLd(website) }}
      />
    </>
  );
}
