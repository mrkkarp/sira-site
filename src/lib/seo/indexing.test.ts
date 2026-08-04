import { afterEach, beforeEach, describe, expect, it } from "vitest";
import {
  indexableLocales,
  isCanonicalDomain,
  isIndexable,
  isIndexableLocale,
  robotsMetadata,
} from "./indexing";

describe("isIndexable", () => {
  const original = {
    VERCEL_ENV: process.env.VERCEL_ENV,
    SEO_NOINDEX: process.env.SEO_NOINDEX,
    NEXT_PUBLIC_SITE_URL: process.env.NEXT_PUBLIC_SITE_URL,
  };

  beforeEach(() => {
    delete process.env.VERCEL_ENV;
    delete process.env.SEO_NOINDEX;
    // The domain gate is tested in its own block below; these cases are about
    // the environment, so they start from "the domain has been switched over".
    process.env.NEXT_PUBLIC_SITE_URL = "https://odudlab.com";
  });

  afterEach(() => {
    for (const [key, value] of Object.entries(original)) {
      if (value === undefined) delete process.env[key];
      else process.env[key] = value;
    }
  });

  it("is indexable only on the production Vercel environment", () => {
    process.env.VERCEL_ENV = "production";
    expect(isIndexable()).toBe(true);
  });

  it("is NOT indexable on preview deployments", () => {
    process.env.VERCEL_ENV = "preview";
    expect(isIndexable()).toBe(false);
  });

  it("is NOT indexable on development deployments", () => {
    process.env.VERCEL_ENV = "development";
    expect(isIndexable()).toBe(false);
  });

  it("is NOT indexable when VERCEL_ENV is unset (local dev)", () => {
    expect(isIndexable()).toBe(false);
  });

  it("honors the SEO_NOINDEX kill-switch even in production", () => {
    process.env.VERCEL_ENV = "production";
    process.env.SEO_NOINDEX = "true";
    expect(isIndexable()).toBe(false);
  });

  it("maps to explicit index/follow metadata", () => {
    process.env.VERCEL_ENV = "production";
    expect(robotsMetadata()).toEqual({ index: true, follow: true });

    process.env.VERCEL_ENV = "preview";
    expect(robotsMetadata()).toEqual({ index: false, follow: false });
  });

  it("is NOT indexable for a non-indexable locale, even in production", () => {
    process.env.VERCEL_ENV = "production";
    expect(isIndexable("uk")).toBe(true);
    expect(isIndexable("en")).toBe(false);
    expect(isIndexable("pl")).toBe(false);
  });

  it("emits noindex robots metadata for non-indexable locales in production", () => {
    process.env.VERCEL_ENV = "production";
    expect(robotsMetadata("uk")).toEqual({ index: true, follow: true });
    expect(robotsMetadata("en")).toEqual({ index: false, follow: false });
    expect(robotsMetadata("pl")).toEqual({ index: false, follow: false });
  });
});

/**
 * The gate that was missing, and the incident that added it.
 *
 * `sira-site.vercel.app` is a `VERCEL_ENV === "production"` deployment, so it
 * passed every check above and served `index, follow` alongside canonicals
 * pointing at itself — a complete, indexable copy of the shop on a host that
 * is meant to be thrown away at cutover, competing with odudlab.com for the
 * brand's own queries. `SEO_NOINDEX` was designed to prevent exactly this and
 * was never set, which is what a kill-switch whose safe position is "on" does
 * eventually.
 *
 * So the answer is derived rather than remembered: from `NEXT_PUBLIC_SITE_URL`,
 * which already decides `metadataBase`, every canonical, hreflang, the sitemap
 * and OG. It cannot be forgotten separately from the thing it must agree with.
 */
describe("isCanonicalDomain", () => {
  const original = {
    VERCEL_ENV: process.env.VERCEL_ENV,
    SEO_NOINDEX: process.env.SEO_NOINDEX,
    NEXT_PUBLIC_SITE_URL: process.env.NEXT_PUBLIC_SITE_URL,
  };

  beforeEach(() => {
    delete process.env.SEO_NOINDEX;
    process.env.VERCEL_ENV = "production";
  });

  afterEach(() => {
    for (const [key, value] of Object.entries(original)) {
      if (value === undefined) delete process.env[key];
      else process.env[key] = value;
    }
  });

  it("the deployment domain, as it is today, is not indexable", () => {
    process.env.NEXT_PUBLIC_SITE_URL = "https://sira-site.vercel.app";
    expect(isCanonicalDomain()).toBe(false);
    expect(isIndexable("uk")).toBe(false);
  });

  it("nor is any other preview URL Vercel hands out", () => {
    process.env.NEXT_PUBLIC_SITE_URL =
      "https://sira-site-git-main-marko.vercel.app";
    expect(isCanonicalDomain()).toBe(false);
  });

  it("the real domain is", () => {
    process.env.NEXT_PUBLIC_SITE_URL = "https://odudlab.com";
    expect(isCanonicalDomain()).toBe(true);
    expect(isIndexable("uk")).toBe(true);
  });

  /** Unset means local dev, where `metadataBase` falls back to localhost. */
  it("an unset site URL is not a domain", () => {
    delete process.env.NEXT_PUBLIC_SITE_URL;
    expect(isCanonicalDomain()).toBe(false);
  });

  it("a malformed site URL fails closed rather than throwing", () => {
    process.env.NEXT_PUBLIC_SITE_URL = "odudlab.com";
    expect(isCanonicalDomain()).toBe(false);
  });

  /**
   * The kill-switch still overrides everything — it is what covers a staging
   * host that is *not* a vercel.app, which this rule cannot recognise.
   */
  it("SEO_NOINDEX still wins on the real domain", () => {
    process.env.NEXT_PUBLIC_SITE_URL = "https://odudlab.com";
    process.env.SEO_NOINDEX = "true";
    expect(isIndexable("uk")).toBe(false);
  });
});

describe("isIndexableLocale", () => {
  it("only Ukrainian is indexable today (en/pl are Ukrainian fallback)", () => {
    expect(isIndexableLocale("uk")).toBe(true);
    expect(isIndexableLocale("en")).toBe(false);
    expect(isIndexableLocale("pl")).toBe(false);
  });

  it("indexableLocales is exactly ['uk']", () => {
    expect([...indexableLocales]).toEqual(["uk"]);
  });
});
