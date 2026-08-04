import { existsSync, readdirSync } from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";
import { NextRequest } from "next/server";
import {
  KNOWN_TOP_LEVEL_SEGMENTS,
  SEGMENTS_WITHOUT_INDEX_PAGE,
  SEGMENTS_WITH_CHILD_ROUTES,
  isServedPath,
  redirectToCanonical,
} from "./proxy";
import { defaultLocale, locales } from "@/i18n/config";
import {
  shopCategorySlugs,
  shopSubcategories,
} from "@/lib/schemas/product-categories";

/**
 * `KNOWN_TOP_LEVEL_SEGMENTS` in `src/proxy.ts` is a hand-written mirror of the
 * route folders under `src/app/[locale]/`. Nothing kept the two in sync, and
 * the failure it allows is not cosmetic:
 *
 * The proxy only consults the `Redirects` collection for paths whose first
 * segment is NOT in that set. So a route folder that exists on disk but is
 * missing from the set becomes eligible for legacy-redirect matching — and if
 * a row happens to share its name (82 legacy Horoshop aliases are live today,
 * all bare single segments like `/riflo`, `/volcano`), the brand-new page is
 * permanently 301'd away to an old URL and is simply unreachable. The reverse
 * drift is milder but still wrong: a segment listed here with no folder behind
 * it silently disables redirects for that path.
 *
 * This test makes the mirror self-enforcing, so adding a route folder without
 * touching the proxy fails here rather than in production.
 */
describe("proxy route segments", () => {
  const localeRouteDir = path.join(process.cwd(), "src/app/[locale]");

  /** Route folders = real URL segments. Files (`page.tsx`, `layout.tsx`, …)
   * and Next's grouping/private conventions (`(group)`, `_internal`,
   * `[dynamic]`) are not fixed top-level segments and are excluded. */
  const routeFolders = readdirSync(localeRouteDir, { withFileTypes: true })
    .filter((entry) => entry.isDirectory())
    .map((entry) => entry.name)
    .filter(
      (name) =>
        !name.startsWith("(") && !name.startsWith("_") && !name.startsWith("["),
    );

  /** Roots that live outside `[locale]` and are handled by the proxy directly. */
  const nonLocalisedRoots = ["admin", "api", "design-system"];

  /**
   * The seven category slugs are real top-level URLs (`/rakovyny`, `/vazony`,
   * …) with no folder of their own: they are served by the dynamic
   * `src/app/[locale]/[category]/` route, which the folder scan above excludes
   * by design. Sourced from `shopCategorySlugs` — the same map the route and
   * the proxy read — so adding an eighth category cannot make this test drift.
   *
   * They matter more than the rest of the list: `/rakovyny` still has a
   * `Redirects` row from when it pointed at `/shop/sinks`, so if it fell out of
   * `KNOWN_TOP_LEVEL_SEGMENTS` the proxy would find that row and 301 the
   * category away from itself, permanently. Hence the third assertion below.
   */
  const categorySlugs = Object.values(shopCategorySlugs);

  /** Locales other than the default one are real URL prefixes; the default
   * locale is not prefixed (`/shop`, never `/uk/shop`). */
  const prefixedLocales = locales.filter((locale) => locale !== defaultLocale);

  it("covers every route folder under src/app/[locale]/", () => {
    expect(routeFolders.length).toBeGreaterThan(0);
    const missing = routeFolders.filter(
      (segment) => !KNOWN_TOP_LEVEL_SEGMENTS.has(segment),
    );
    expect(
      missing,
      `route folder(s) exist but are missing from KNOWN_TOP_LEVEL_SEGMENTS in ` +
        `src/proxy.ts — a legacy redirect row with the same name would shadow ` +
        `the page entirely: ${missing.join(", ")}`,
    ).toEqual([]);
  });

  it("has no segment that no longer maps to a route", () => {
    const expected = new Set([
      ...routeFolders,
      ...nonLocalisedRoots,
      ...prefixedLocales,
      ...categorySlugs,
    ]);
    const stale = [...KNOWN_TOP_LEVEL_SEGMENTS].filter(
      (segment) => !expected.has(segment),
    );
    expect(
      stale,
      `KNOWN_TOP_LEVEL_SEGMENTS lists segment(s) with no route behind them, ` +
        `which silently disables legacy redirects for those paths: ${stale.join(", ")}`,
    ).toEqual([]);
  });

  it("covers every shop category slug", () => {
    // The `covers every route folder` test cannot see these — there is no
    // folder — so they need their own assertion. Without it, dropping the
    // `...Object.values(shopCategorySlugs)` spread from `src/proxy.ts` would
    // leave the whole suite green while `/rakovyny` 301'd itself into the
    // fossil `/shop/sinks` row it still has in the Redirects collection.
    expect(categorySlugs.length).toBeGreaterThan(0);
    const missing = categorySlugs.filter(
      (slug) => !KNOWN_TOP_LEVEL_SEGMENTS.has(slug),
    );
    expect(
      missing,
      `category slug(s) missing from KNOWN_TOP_LEVEL_SEGMENTS in ` +
        `src/proxy.ts — each is a live category page AND a legacy redirect ` +
        `row, so the row would shadow the page: ${missing.join(", ")}`,
    ).toEqual([]);
  });

  it("does not list the default locale, which is never a URL prefix", () => {
    expect(KNOWN_TOP_LEVEL_SEGMENTS.has(defaultLocale)).toBe(false);
  });

  /**
   * `SEGMENTS_WITHOUT_INDEX_PAGE` is the second hand-written mirror of the
   * route tree, and it is the more brittle of the two: it has to be a list
   * rather than a lookup because the proxy runs without a filesystem. Derive
   * the truth from disk and compare both ways.
   *
   * Both directions are a real bug. A folder that loses its `page.tsx` and is
   * not added here starts answering the bare segment with a streamed soft 404
   * from the `[category]` catch-all instead of a `404`. A segment listed here
   * that *does* have a `page.tsx` is worse — the proxy 404s a page that exists.
   */
  it("lists exactly the route folders that have no index page", () => {
    const withoutIndex = routeFolders.filter(
      (folder) => !existsSync(path.join(localeRouteDir, folder, "page.tsx")),
    );
    expect([...SEGMENTS_WITHOUT_INDEX_PAGE].sort()).toEqual(
      withoutIndex.sort(),
    );
  });

  /**
   * Same discipline for the other direction. A folder that gains a child route
   * and is not added here has that child 404'd by the proxy before it can
   * render; one listed here that has no child lets the `[category]` catch-all
   * answer `/<segment>/anything` with a streamed soft 404 again.
   */
  it("lists exactly the route folders that have a child route", () => {
    const withChildren = routeFolders.filter((folder) =>
      readdirSync(path.join(localeRouteDir, folder), {
        withFileTypes: true,
      }).some((entry) => entry.isDirectory()),
    );
    expect([...SEGMENTS_WITH_CHILD_ROUTES].sort()).toEqual(withChildren.sort());
  });
});

/**
 * The top-level `[category]` / `[category]/[subcategory]` routes match every
 * one- and two-segment URL there is, so an unknown one no longer falls through
 * to the filesystem 404 — it renders a page that calls `notFound()`, and by
 * then the `loading.tsx` Suspense boundary has already flushed a `200`. A
 * status cannot be un-sent, so the only place left to say "this does not
 * exist" is before the render: `isServedPath` in `src/proxy.ts`.
 *
 * Verified end-to-end against a production build (`/foo` → 404, `/rakovyny` →
 * 200); this is the cheap unit-level guard on the rule itself.
 */
describe("isServedPath", () => {
  const served = [
    [], // the locale root
    ["shop"],
    ["about"],
    ["products", "some-slug"], // the route's own notFound() answers for this
    ["collections", "some-slug"],
    ...Object.values(shopCategorySlugs).map((slug) => [slug]),
    ...shopSubcategories.map((sub) => [
      shopCategorySlugs[sub.category],
      sub.slug,
    ]),
  ];

  it.each(served)("serves /%s/%s", (...segments) => {
    expect(isServedPath(segments.filter(Boolean))).toBe(true);
  });

  const notServed: [string, string[]][] = [
    ["a segment no route owns", ["foo"]],
    ["a two-segment path no route owns", ["foo", "bar"]],
    ["the bare /products, which has no index page", ["products"]],
    // The catch-all is two segments at the *root*, so it reaches under every
    // first segment, not just the category ones. `/shop/outdoor` is the case
    // that made this concrete: it was a real URL until the categories moved,
    // it is still the target of a legacy redirect row, and it came back `200`.
    ["a second segment under a leaf route", ["shop", "outdoor"]],
    ["a second segment under another leaf route", ["about", "team"]],
    // The subcategory table is per-category: `nakladni` is a real slug, but
    // only under `/rakovyny`. Pairing it with the wrong parent must not pass.
    ["a subcategory under the wrong category", ["vazony", "nakladni"]],
    ["a subcategory that does not exist", ["rakovyny", "zzz"]],
    // `/stolyky/zhurnalni` is the one deliberate omission: every table is a
    // coffee table, so the page would duplicate its own parent. It redirects.
    ["the deliberately-absent /stolyky/zhurnalni", ["stolyky", "zhurnalni"]],
    ["anything below a subcategory", ["rakovyny", "nakladni", "extra"]],
  ];

  it.each(notServed)("does not serve %s", (_label, segments) => {
    expect(isServedPath(segments)).toBe(false);
  });
});

/**
 * `next.config.ts` sets `skipTrailingSlashRedirect: true` so that the 162
 * migrated Horoshop URLs — every one of which ends in a slash — reach their
 * destination in one hop instead of paying a `308` first. The cost of taking
 * that over is that stripping the slash from a *live* route is now this
 * proxy's job, and it is not optional: without it `/shop/` and `/shop` are two
 * URLs serving one page.
 *
 * The obvious implementation is wrong in a way that is invisible in review.
 * `request.nextUrl.clone()` returns a `NextURL`, which decides once, in
 * `analyze()` at construction, whether the path had a trailing slash, and
 * re-applies that decision in its `href` getter via `formatNextPathnameInfo`.
 * Assigning `.pathname` writes the inner URL and never re-runs `analyze()`.
 * So the clone of a request for `/shop/` still serialises as `/shop/`, and
 * `NextResponse.redirect` — which reads `href` — answers
 * `308 Location: /shop/`: a redirect to itself, forever, on every indexed
 * page. It was shipped that way for about ten minutes and caught by curl.
 *
 * These tests read the emitted `Location` header rather than the URL object,
 * because the header is where the bug lives.
 */
describe("redirectToCanonical", () => {
  const locationFor = (url: string, pathname: string) =>
    redirectToCanonical(
      new NextRequest(new Request(url)),
      pathname,
    ).headers.get("location");

  it("actually removes the trailing slash", () => {
    expect(locationFor("https://odudlab.com/shop/", "/shop")).toBe(
      "https://odudlab.com/shop",
    );
  });

  it("removes it under a locale prefix too", () => {
    expect(
      locationFor("https://odudlab.com/en/rakovyny/", "/en/rakovyny"),
    ).toBe("https://odudlab.com/en/rakovyny");
  });

  it("removes it from a nested path", () => {
    expect(
      locationFor(
        "https://odudlab.com/rakovyny/nakladni/",
        "/rakovyny/nakladni",
      ),
    ).toBe("https://odudlab.com/rakovyny/nakladni");
  });

  /**
   * `new URL(pathname, base)` keeps the base's origin and nothing else, so the
   * query has to be copied by hand. A `?page=2` or a `?gclid=…` dropped here
   * would silently cost a paid click its attribution.
   */
  it("carries the query string over the hop", () => {
    expect(locationFor("https://odudlab.com/vazony/?page=2", "/vazony")).toBe(
      "https://odudlab.com/vazony?page=2",
    );
  });

  it("keeps a gclid intact", () => {
    expect(
      locationFor("https://odudlab.com/paneli/?gclid=abc123", "/paneli"),
    ).toBe("https://odudlab.com/paneli?gclid=abc123");
  });

  it("answers 308, not 301, so a POST stays a POST", () => {
    const response = redirectToCanonical(
      new NextRequest(new Request("https://odudlab.com/contact/")),
      "/contact",
    );
    expect(response.status).toBe(308);
  });

  /**
   * The one case where the answer legitimately ends in a slash. `/` is its own
   * canonical form and must not be rewritten to the empty string.
   */
  it("leaves the root alone", () => {
    expect(locationFor("https://odudlab.com/", "/")).toBe(
      "https://odudlab.com/",
    );
  });
});
