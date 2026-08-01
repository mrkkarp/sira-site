import { afterEach, beforeEach, describe, expect, it } from "vitest";
import {
  indexableLocales,
  isIndexable,
  isIndexableLocale,
  robotsMetadata,
} from "./indexing";

describe("isIndexable", () => {
  const original = {
    VERCEL_ENV: process.env.VERCEL_ENV,
    SEO_NOINDEX: process.env.SEO_NOINDEX,
  };

  beforeEach(() => {
    delete process.env.VERCEL_ENV;
    delete process.env.SEO_NOINDEX;
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
