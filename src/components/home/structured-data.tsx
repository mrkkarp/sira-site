import type { Locale } from "@/i18n/config";
import type { Dictionary } from "@/i18n/get-dictionary";
import { contact } from "@/config/contact";
import { getSiteUrl } from "@/lib/site-url";
import { serializeJsonLd } from "@/lib/json-ld";

/**
 * Organization + WebSite JSON-LD for the homepage (Prompt 4 §14). Only uses
 * data already confirmed elsewhere in the codebase (`src/config/contact.ts`,
 * `dictionary.site`) — no invented founding date, employee count, or social
 * profile that isn't in `contact.ts`.
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
    "@type": "Organization",
    name: dictionary.site.name,
    url: siteUrl,
    email: contact.email,
    telephone: contact.phone.href,
    address: {
      "@type": "PostalAddress",
      streetAddress: contact.address.line,
      addressCountry: "UA",
    },
    sameAs: [contact.instagram.url],
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
