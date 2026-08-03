import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { SHARE_CARD, pageSeo } from "./page-seo";

const SITE = "https://odudlab.com";

describe("pageSeo", () => {
  const original = process.env.NEXT_PUBLIC_SITE_URL;

  beforeEach(() => {
    process.env.NEXT_PUBLIC_SITE_URL = SITE;
  });

  afterEach(() => {
    if (original === undefined) delete process.env.NEXT_PUBLIC_SITE_URL;
    else process.env.NEXT_PUBLIC_SITE_URL = original;
  });

  const base = {
    locale: "uk",
    path: "/shop",
    title: "Каталог",
    description: "Опис",
    siteName: "ODUDLAB",
  } as const;

  /**
   * The regression this whole helper exists for. Every page except
   * `/products/[slug]` used to ship an `openGraph` with no `images` at all, so
   * every share of the homepage, the catalogue or a collection rendered as a
   * bare text link. A default that a call site cannot forget is the fix, so
   * "there is always an image" is the thing worth pinning down.
   */
  it("falls back to the workshop share card when no image is given", () => {
    const { openGraph } = pageSeo(base);
    expect(openGraph?.images).toEqual([
      {
        url: `${SITE}${SHARE_CARD.path}`,
        width: SHARE_CARD.width,
        height: SHARE_CARD.height,
      },
    ]);
  });

  it("prefers a page-specific image and makes it absolute", () => {
    const { openGraph } = pageSeo({ ...base, image: "/media/basin.jpg" });
    expect(openGraph?.images).toEqual([{ url: `${SITE}/media/basin.jpg` }]);
  });

  /**
   * Product photos come from Payload/R2 as absolute URLs on another host.
   * Passing one through `new URL(image, siteUrl)` must leave it alone rather
   * than re-root it onto the site domain.
   */
  it("leaves an already-absolute image on its own host", () => {
    const remote = "https://pub-abc.r2.dev/media/basin.jpg";
    const { openGraph } = pageSeo({ ...base, image: remote });
    expect(openGraph?.images).toEqual([{ url: remote }]);
  });

  it("builds an absolute og:url from the locale-prefixed path", () => {
    expect(pageSeo(base).openGraph?.url).toBe(`${SITE}/shop`);
    expect(pageSeo({ ...base, locale: "en" }).openGraph?.url).toBe(
      `${SITE}/en/shop`,
    );
  });

  it("keeps the canonical relative and locale-prefixed", () => {
    expect(pageSeo(base).alternates?.canonical).toBe("/shop");
    expect(pageSeo({ ...base, locale: "pl" }).alternates?.canonical).toBe(
      "/pl/shop",
    );
    // `/` is the one path `localeHref` cannot simply concatenate.
    expect(pageSeo({ ...base, path: "/" }).alternates?.canonical).toBe("/");
    expect(
      pageSeo({ ...base, path: "/", locale: "en" }).alternates?.canonical,
    ).toBe("/en");
  });

  /**
   * Only `uk` is in `indexableLocales` (en/pl fall back to Ukrainian copy), so
   * advertising en/pl alternates would point hreflang at pages the site
   * deliberately keeps out of the index.
   */
  it("advertises only the indexable locales, plus x-default", () => {
    expect(pageSeo(base).alternates?.languages).toEqual({
      uk: "/shop",
      "x-default": "/shop",
    });
  });

  it("honours a narrowed hreflang set", () => {
    // The shape `/care`, `/returns` and `/payment-delivery` pass: only the
    // locales that actually have transcribed prose.
    expect(
      pageSeo({ ...base, path: "/care", hreflangLocales: [] }).alternates
        ?.languages,
    ).toEqual({});

    expect(
      pageSeo({ ...base, path: "/care", hreflangLocales: ["en", "pl"] })
        .alternates?.languages,
    ).toEqual({
      en: "/en/care",
      pl: "/pl/care",
      // `uk` is not advertised here, so x-default must not silently point at
      // it — it falls to the first locale that *is*.
      "x-default": "/en/care",
    });
  });

  it("passes title, description, siteName and locale through to Open Graph", () => {
    const { openGraph } = pageSeo({ ...base, locale: "pl" });
    expect(openGraph).toMatchObject({
      title: "Каталог",
      description: "Опис",
      siteName: "ODUDLAB",
      locale: "pl",
      type: "website",
    });
  });
});
