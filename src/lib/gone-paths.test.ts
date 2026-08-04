import { readFileSync } from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";
import { GONE_PATHS, isGonePath, renderGonePage } from "./gone-paths";
import { KNOWN_TOP_LEVEL_SEGMENTS } from "@/proxy";
import { locales } from "@/i18n/config";
import { STATIC_LEGACY_REDIRECTS } from "@/services/legacy-static-redirects";

/**
 * `GONE_PATHS` is a claim about a site that no longer answers: "these 34
 * addresses existed on odudlab.com and are demo junk". Nothing about the
 * running app can check that claim, so it is checked against the frozen
 * export in `_horoshop-export/` — the old site's own sitemaps, saved before
 * the migration. Every assertion below reads those files rather than a
 * second hand-written list, so the two cannot drift apart.
 */
const exportDir = path.join(process.cwd(), "_horoshop-export");

function sitemapPaths(file: string): string[] {
  const xml = readFileSync(path.join(exportDir, file), "utf8");
  return [...xml.matchAll(/<loc>([^<]*)<\/loc>/g)].map((match) =>
    match[1].replace("https://odudlab.com", ""),
  );
}

/** `/en/laptops/` and `/laptops/` are the same page to the proxy, which
 *  judges the locale-stripped path. Normalise the export the same way. */
function toBarePath(url: string): string {
  const withoutLocale = url.replace(/^\/(en|pl)(?=\/|$)/, "");
  const trimmed = withoutLocale.replace(/\/$/, "");
  return trimmed === "" ? "/" : trimmed;
}

const oldPagePaths = new Set(sitemapPaths("sitemap-pages.xml").map(toBarePath));
const oldBrandPaths = new Set(
  sitemapPaths("sitemap-brands.xml").map(toBarePath),
);

describe("GONE_PATHS", () => {
  it("only names URLs the old site actually had", () => {
    // The failure this prevents is a 410 invented from memory: a path that
    // was never on odudlab.com is at best dead code, and at worst a
    // tombstone sitting on an address a future route might want.
    const invented = [...GONE_PATHS].filter(
      (p) => !oldPagePaths.has(p) && !oldBrandPaths.has(p),
    );
    expect(
      invented,
      `path(s) in GONE_PATHS that appear in neither sitemap-pages.xml nor ` +
        `sitemap-brands.xml: ${invented.join(", ")}`,
    ).toEqual([]);
  });

  it("accounts for every old URL that is not a live route or a redirect", () => {
    // The other direction, and the one that matters for the migration: an
    // old indexed URL that is neither served, nor redirected, nor buried
    // would just 404 — the "everything to the homepage or nothing" failure
    // the migration exists to avoid, one page at a time.
    const redirected = new Set(STATIC_LEGACY_REDIRECTS.map((r) => r.fromPath));
    const unaccounted = [...oldPagePaths, ...oldBrandPaths].filter(
      (p) =>
        p !== "/" &&
        !GONE_PATHS.has(p) &&
        !redirected.has(p) &&
        !KNOWN_TOP_LEVEL_SEGMENTS.has(p.slice(1)),
    );
    expect(
      unaccounted,
      `old URL(s) with no destination — not served, not redirected, not ` +
        `gone: ${unaccounted.join(", ")}`,
    ).toEqual([]);
  });

  it("never buries a path a live route owns", () => {
    // A 410 is checked before everything else in the proxy, so an overlap
    // here does not merely shadow a page — it kills it outright, with the
    // one status that tells Google never to come back.
    const collisions = [...GONE_PATHS].filter((p) =>
      KNOWN_TOP_LEVEL_SEGMENTS.has(p.slice(1)),
    );
    expect(
      collisions,
      `GONE_PATHS would 410 a live route: ${collisions.join(", ")}`,
    ).toEqual([]);
  });

  it("never contradicts a redirect", () => {
    const both = STATIC_LEGACY_REDIRECTS.map((r) => r.fromPath).filter((p) =>
      GONE_PATHS.has(p),
    );
    expect(
      both,
      `path(s) both redirected and marked gone — the proxy answers 410 and ` +
        `the redirect silently never fires: ${both.join(", ")}`,
    ).toEqual([]);
  });

  it("is written in the locale-stripped, trailing-slash-free form the proxy compares", () => {
    // `barePath` in `src/proxy.ts` has no locale prefix and no trailing
    // slash (Next's own 308 strips it before the proxy runs). An entry in
    // any other shape is simply never matched, and silently so.
    for (const p of GONE_PATHS) {
      expect(p.startsWith("/"), `${p} must be absolute`).toBe(true);
      expect(p.endsWith("/"), `${p} must not have a trailing slash`).toBe(
        false,
      );
      expect(
        /^\/(en|pl|uk)(\/|$)/.test(p),
        `${p} must not carry a locale prefix`,
      ).toBe(false);
    }
  });
});

describe("isGonePath", () => {
  it("matches the demo catalogue", () => {
    expect(isGonePath("/iphone-13")).toBe(true);
    expect(isGonePath("/brands")).toBe(true);
    expect(isGonePath("/apple")).toBe(true);
  });

  it("does not match a live route or an unrelated path", () => {
    expect(isGonePath("/rakovyny")).toBe(false);
    expect(isGonePath("/shop")).toBe(false);
    expect(isGonePath("/")).toBe(false);
    expect(isGonePath("/iphone-13/extra")).toBe(false);
  });
});

describe("renderGonePage", () => {
  it.each(locales)("renders a complete %s document", (locale) => {
    const html = renderGonePage(locale);
    expect(html.startsWith("<!doctype html>")).toBe(true);
    expect(html).toContain(`<html lang="${locale}">`);
    // Without this the tombstone itself gets indexed, which is the exact
    // outcome the 410 exists to prevent.
    expect(html).toContain('<meta name="robots" content="noindex">');
    expect(html).toContain("410");
  });

  it("links back into the catalogue in the visitor's language", () => {
    expect(renderGonePage("uk")).toContain('href="/shop"');
    expect(renderGonePage("en")).toContain('href="/en/shop"');
    expect(renderGonePage("pl")).toContain('href="/pl/shop"');
  });
});
