import { existsSync, readdirSync } from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";
import { NextRequest } from "next/server";
import {
  KNOWN_TOP_LEVEL_SEGMENTS,
  SEGMENTS_WITHOUT_INDEX_PAGE,
  SEGMENTS_WITH_CHILD_ROUTES,
  isServedPath,
  proxy,
  redirectToCanonical,
} from "./proxy";
import { getPublishedProjects } from "@/content/projects";
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
    // Not a fixture string: the real registry, so renaming a project slug
    // without telling the proxy fails here rather than 404ing a live case
    // study that Google has already indexed.
    ...getPublishedProjects().map((project) => ["projects", project.slug]),
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
    // Unlike `/products/<slug>`, a project slug is a static in-memory set, so
    // the proxy can answer a real 404 here instead of letting the page stream
    // a soft one. A case study is exactly the kind of URL that gets pasted
    // into a chat with a typo, so the wrong answer would be indexable.
    ["a project slug nobody has published", ["projects", "no-such-project"]],
    ["anything below a subcategory", ["rakovyny", "nakladni", "extra"]],
  ];

  it.each(notServed)("does not serve %s", (_label, segments) => {
    expect(isServedPath(segments)).toBe(false);
  });
});

/**
 * The status a URL that owns nothing answers with.
 *
 * This is a regression test with a specific production incident behind it.
 * The branch used to be `NextResponse.rewrite("/_not-found")`, relying on
 * Next's own not-found entry to carry the `404`. It does under `next start`,
 * which is why the e2e suite was green and stayed green — and it does not on
 * Vercel, where `/_not-found` is prerendered and served off the edge as a
 * static file. Every unknown URL on the deployed site answered `200`, with no
 * `<meta name="robots">` in the prerendered document at all: an unbounded
 * supply of indexable duplicate pages, one per typo a crawler ever follows.
 *
 * `next start` cannot reproduce that, so the guard has to be here, on the
 * response object the proxy actually returns, where the platform has no say.
 *
 * `/about/team` is the fixture rather than `/foo` on purpose: `about` is in
 * `KNOWN_TOP_LEVEL_SEGMENTS`, so the request short-circuits past the
 * `Redirects` lookup and the test needs no database.
 */
describe("proxy 404", () => {
  const notFoundResponse = (url: string) =>
    proxy(new NextRequest(new Request(url)));

  it("answers with a real 404 status, not a rewrite", async () => {
    const response = await notFoundResponse("https://odudlab.com/about/team");
    expect(response.status).toBe(404);
    // A rewrite would carry this instead of a body of its own.
    expect(response.headers.get("x-middleware-rewrite")).toBeNull();
  });

  it("serves an HTML document the crawler is told not to index", async () => {
    const response = await notFoundResponse("https://odudlab.com/about/team");
    expect(response.headers.get("content-type")).toContain("text/html");
    expect(response.headers.get("x-robots-tag")).toBe("noindex");
    const html = await response.text();
    expect(html).toContain('<meta name="robots" content="noindex">');
    expect(html).toContain("Сторінку не знайдено");
  });

  /**
   * Unlike the 410 list, which is closed and cacheable forever, a 404 is only
   * ever "no route owns this *yet*" — a slug added in the admin, a redirect
   * row created after launch. Caching it at the edge would outlive its reason.
   */
  it("does not let the answer be cached", async () => {
    const response = await notFoundResponse("https://odudlab.com/about/team");
    expect(response.headers.get("cache-control")).toBe("no-store");
  });

  it("keeps the visitor's language under a locale prefix", async () => {
    const response = await notFoundResponse(
      "https://odudlab.com/en/about/team",
    );
    expect(response.status).toBe(404);
    const html = await response.text();
    expect(html).toContain('<html lang="en">');
    expect(html).toContain("Page not found");
  });

  it("still serves a page that exists", async () => {
    const response = await notFoundResponse("https://odudlab.com/about");
    expect(response.status).toBe(200);
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

/**
 * The pre-Horoshop URL families, end to end through the proxy.
 *
 * `src/lib/legacy-url-map.test.ts` proves the map is complete and its targets
 * are real. What it cannot prove is that the proxy *reaches* it — that the
 * branch order is right, that the query string survives, that `/ru` is
 * stripped before anything is looked up. That is what this block is for, and
 * every case in it is one that was measured returning `404` on production
 * before the map existed.
 *
 * No database is needed: `findStaticLegacyRedirect` answers from memory, and
 * that is the point of consulting it first.
 */
describe("proxy legacy 301s", () => {
  const redirectFor = async (url: string) => {
    const response = await proxy(new NextRequest(new Request(url)));
    return {
      status: response.status,
      location: response.headers.get("location"),
    };
  };

  /** The one the owner reported: a live URL the *old* server still 301s and
   *  the new site answered with a 404. */
  it("answers the WooCommerce category that started this", async () => {
    expect(
      await redirectFor("https://odudlab.com/kategoriya/umyvalnuku/"),
    ).toEqual({ status: 301, location: "https://odudlab.com/rakovyny" });
  });

  it("sends an old product URL to the product that replaced it", async () => {
    expect(
      await redirectFor(
        "https://odudlab.com/katalog/rakovina-betonnaya-tower/",
      ),
    ).toEqual({ status: 301, location: "https://odudlab.com/products/tower" });
  });

  it("sends a discontinued product to the category that succeeded it", async () => {
    expect(
      await redirectFor("https://odudlab.com/katalog/betonna-vaza-slim-70/"),
    ).toEqual({ status: 301, location: "https://odudlab.com/vazony" });
  });

  it("sends an abandoned product line to the homepage", async () => {
    // «Якщо немає відповідної — то просто на головну». Concrete lamps: the
    // catalogue has no lighting and nothing close to it.
    expect(
      await redirectFor(
        "https://odudlab.com/katalog/betonnyj-svitylnyk-kulya/",
      ),
    ).toEqual({ status: 301, location: "https://odudlab.com/" });
  });

  it("sends a faceted filter to the catalogue", async () => {
    expect(await redirectFor("https://odudlab.com/price/1000-2000/")).toEqual({
      status: 301,
      location: "https://odudlab.com/shop",
    });
  });

  it("resolves a /ru twin through the Ukrainian rule", async () => {
    // 193 of the 490 dead addresses are Russian. There is no Russian site to
    // send them to, and there are no Russian rules either.
    expect(
      await redirectFor(
        "https://odudlab.com/ru/katalog/rakovina-betonnaya-tower/",
      ),
    ).toEqual({ status: 301, location: "https://odudlab.com/products/tower" });
  });

  it("sends the /ru twin of a live page to that page", async () => {
    // Not a legacy address — the category, spelled with a locale that never
    // existed here. It must not reach the lookups: the `Redirects` collection
    // still holds the fossil `/rakovyny → /shop/sinks` row, and `/shop/sinks`
    // is a 404 today.
    expect(await redirectFor("https://odudlab.com/ru/rakovyny/")).toEqual({
      status: 301,
      location: "https://odudlab.com/rakovyny",
    });
  });

  it("keeps the visitor's language under a locale prefix", async () => {
    expect(
      await redirectFor(
        "https://odudlab.com/en/katalog/rakovina-betonnaya-tower",
      ),
    ).toEqual({
      status: 301,
      location: "https://odudlab.com/en/products/tower",
    });
  });

  it("does not compose /en/ when the target is the homepage", async () => {
    // `/en` + `/` would be `/en/`, which Next then 308s to `/en` — a second
    // hop on a redirect that is already a hop.
    expect(
      await redirectFor(
        "https://odudlab.com/en/katalog/betonnyj-svitylnyk-kulya",
      ),
    ).toEqual({ status: 301, location: "https://odudlab.com/en" });
  });

  it("carries gclid and utm over the hop", async () => {
    // The redirect must not cost the attribution the ads setup exists for.
    const { location } = await redirectFor(
      "https://odudlab.com/katalog/rakovina-betonnaya-tower/?gclid=abc123&utm_source=google",
    );
    const target = new URL(location as string);
    expect(target.pathname).toBe("/products/tower");
    expect(target.searchParams.get("gclid")).toBe("abc123");
    expect(target.searchParams.get("utm_source")).toBe("google");
  });

  it("still 404s an address that was never on the old site", async () => {
    // The map is not a catch-all. Only the dead namespaces have safety nets
    // under them; a bare invented segment is still a hard 404.
    const response = await proxy(
      new NextRequest(new Request("https://odudlab.com/definitely-not-a-page")),
    );
    expect(response.status).toBe(404);
  });

  it("still answers 410 for the demo catalogue", async () => {
    // The `GONE_PATHS` check runs before all of this and stays that way: the
    // template's own iPhones were never ODUDLAB pages, so there is nothing
    // "similar" to send anyone to.
    const response = await proxy(
      new NextRequest(new Request("https://odudlab.com/iphone-13")),
    );
    expect(response.status).toBe(410);
  });
});
