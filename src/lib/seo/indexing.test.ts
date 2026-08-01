import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { isIndexable, robotsMetadata } from "./indexing";

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
});
