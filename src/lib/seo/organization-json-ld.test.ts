import { describe, expect, it } from "vitest";
import { contact } from "@/config/contact";
import {
  buildContactPageJsonLd,
  buildOrganizationJsonLd,
  organizationId,
} from "./organization-json-ld";

const SITE = "https://odudlab.com";

describe("buildOrganizationJsonLd", () => {
  it("identifies the business by a stable @id", () => {
    expect(buildOrganizationJsonLd({ siteUrl: SITE, name: "ODUDLAB" })).toMatchObject(
      { "@type": "Organization", "@id": `${SITE}/#organization`, url: SITE },
    );
  });

  it("does not double the slash when the site URL already ends in one", () => {
    // `getSiteUrl().toString()` returns a trailing slash, so this is the shape
    // every real caller passes.
    expect(organizationId(`${SITE}/`)).toBe(`${SITE}/#organization`);
    expect(
      buildOrganizationJsonLd({ siteUrl: `${SITE}/`, name: "ODUDLAB" }).url,
    ).toBe(SITE);
  });

  it("carries the owner-confirmed contact details verbatim", () => {
    const org = buildOrganizationJsonLd({ siteUrl: SITE, name: "ODUDLAB" });
    expect(org.email).toBe(contact.email);
    expect(org.telephone).toBe(contact.phone.href);
    expect(org.address.streetAddress).toBe(contact.address.line);
    expect(org.sameAs).toEqual([contact.instagram.url]);
  });

  it("pins the showroom with the exact confirmed coordinates", () => {
    // The address alone resolves to somewhere inside a 2 km² exhibition park;
    // the pin is what makes it findable.
    expect(buildOrganizationJsonLd({ siteUrl: SITE, name: "O" }).location.geo)
      .toEqual({
        "@type": "GeoCoordinates",
        latitude: contact.address.coords.lat,
        longitude: contact.address.coords.lng,
      });
  });

  /**
   * `contact.ts` keeps `workingHours` null on purpose until the owner verifies
   * a schedule. Publishing invented hours in a machine-readable form is how
   * someone ends up standing outside a locked showroom, so the absence is the
   * behaviour under test, not an oversight.
   */
  it("publishes no opening hours, because none are confirmed", () => {
    const org = buildOrganizationJsonLd({ siteUrl: SITE, name: "ODUDLAB" });
    expect(contact.workingHours).toBeNull();
    expect(JSON.stringify(org)).not.toContain("opening");
  });
});

describe("buildContactPageJsonLd", () => {
  const input = {
    siteUrl: `${SITE}/`,
    path: "/contact",
    name: "Контакти",
    description: "Як з нами звʼязатися",
    siteName: "ODUDLAB",
    locale: "uk",
  } as const;

  it("describes the page and names the business as its main entity", () => {
    expect(buildContactPageJsonLd(input)).toMatchObject({
      "@context": "https://schema.org",
      "@type": "ContactPage",
      "@id": `${SITE}/contact`,
      url: `${SITE}/contact`,
      name: "Контакти",
      inLanguage: "uk",
      mainEntity: { "@id": `${SITE}/#organization` },
    });
  });

  it("keeps the locale prefix in the page URL", () => {
    expect(
      buildContactPageJsonLd({ ...input, path: "/en/contact", locale: "en" })
        .url,
    ).toBe(`${SITE}/en/contact`);
  });

  /**
   * The homepage and `/contact` both emit the business. They must resolve to
   * one node, or a consumer is entitled to read them as two companies that
   * happen to share a name and an address.
   */
  it("shares one identity with the homepage's Organization node", () => {
    expect(buildContactPageJsonLd(input).mainEntity["@id"]).toBe(
      buildOrganizationJsonLd({ siteUrl: SITE, name: "ODUDLAB" })["@id"],
    );
  });
});
