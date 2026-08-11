import type { Locale } from "@/i18n/config";
import { contact } from "@/config/contact";

/**
 * The stable identity of the business across every JSON-LD node on the site.
 *
 * Without an `@id`, the `Organization` on the homepage and the one on
 * `/contact` are two unrelated blobs that happen to share a name, and a
 * consumer is free to treat them as two businesses. With it they are one node
 * described twice, which is what they are.
 */
export function organizationId(siteUrl: string): string {
  return `${siteUrl.replace(/\/$/, "")}/#organization`;
}

/**
 * The single description of ODUDLAB-the-business, reused by every page that
 * needs to name it.
 *
 * Strictly limited to `src/config/contact.ts` — that file is the owner-
 * confirmed contact data and carries its own standing instruction not to add
 * unconfirmed channels. In particular there are deliberately **no**
 * `openingHours`: the owner has not verified a schedule, and publishing
 * invented hours in machine-readable form is how someone ends up standing
 * outside a locked showroom.
 *
 * `locale` picks the spelling of the street address and nothing else. The
 * business is one business in every language — same `@id`, same phone, same
 * e-mail, same coordinates — but the address is prose, and emitting the
 * Cyrillic line on `/en` would contradict the Latin one printed a screen
 * lower. Structured data that disagrees with the page it annotates is worse
 * than none: it is the half a search engine is told to trust.
 */
export function buildOrganizationJsonLd({
  siteUrl,
  name,
  locale,
}: {
  siteUrl: string;
  name: string;
  locale: Locale;
}) {
  const base = siteUrl.replace(/\/$/, "");

  return {
    "@type": "Organization",
    "@id": organizationId(base),
    name,
    url: base,
    email: contact.email,
    telephone: contact.phone.href,
    address: {
      "@type": "PostalAddress",
      streetAddress: contact.address.line[locale],
      addressCountry: "UA",
    },
    /**
     * The exact pin the owner dropped, not a geocode of the address string.
     * "ВДНГ, павільйон 49" is a pavilion inside a 2 km² exhibition park, and
     * an address-string lookup lands somewhere near the entrance — which is
     * the difference between a visitor arriving and a visitor giving up.
     */
    location: {
      "@type": "Place",
      address: {
        "@type": "PostalAddress",
        streetAddress: contact.address.line[locale],
        addressCountry: "UA",
      },
      geo: {
        "@type": "GeoCoordinates",
        latitude: contact.address.coords.lat,
        longitude: contact.address.coords.lng,
      },
    },
    sameAs: [contact.instagram.url],
  };
}

/**
 * `ContactPage` JSON-LD for `/contact`, with the business as its `mainEntity`.
 *
 * The page had no structured data at all: it is the one page on the site whose
 * entire job is "here is how to reach this business", and it was the one page
 * that never said so in a form a machine could read. The homepage carried the
 * `Organization` node instead — true, but the wrong address for it, since
 * that is not the URL anyone lands on looking for a phone number.
 */
export function buildContactPageJsonLd({
  siteUrl,
  path,
  name,
  description,
  siteName,
  locale,
}: {
  siteUrl: string;
  /** Locale-prefixed path, e.g. `/contact` or `/en/contact`. */
  path: string;
  name: string;
  description: string;
  siteName: string;
  locale: Locale;
}) {
  const base = siteUrl.replace(/\/$/, "");
  const url = new URL(path, `${base}/`).toString();

  return {
    "@context": "https://schema.org",
    "@type": "ContactPage",
    "@id": url,
    url,
    name,
    description,
    inLanguage: locale,
    mainEntity: buildOrganizationJsonLd({
      siteUrl: base,
      name: siteName,
      locale,
    }),
  };
}
