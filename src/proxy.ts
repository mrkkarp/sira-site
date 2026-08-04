import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { defaultLocale, locales } from "@/i18n/config";
import { isGonePath, renderGonePage } from "@/lib/gone-paths";
import { findLegacyRedirect } from "@/lib/legacy-redirects";
import { renderNotFoundPage } from "@/lib/status-page";
import {
  shopCategorySlugs,
  shopSubcategories,
} from "@/lib/schemas/product-categories";

const prefixedLocales = locales.filter((locale) => locale !== defaultLocale);

// Every first path segment a *current* route actually owns — mirrors the
// directory names under src/app/[locale]/ plus the non-localised
// admin/design-system/api roots. Prompt 9 §3: legacy Horoshop URLs (old
// product/category aliases, /pro-nas, /oplata-i-dostavka, etc.) are all
// single unprefixed segments that never collide with this list, so the
// Redirects-collection lookup below only runs for paths that AREN'T one
// of these — real traffic (shop, products, cart, ...) never pays for the
// extra DB round-trip, only genuinely-unrecognised paths do.
//
// The seven category slugs are spread in from the same map the routes use,
// not retyped. They are the one group of segments that used to be legacy
// *redirects* and are now real pages: `/rakovyny` had a Redirects row
// pointing at `/shop/sinks`, and had it stayed unlisted here the DB lookup
// would still find that row and 301 the category away from itself, forever.
// Listing them short-circuits the lookup before it can happen — a fossil row
// in the collection is then inert rather than fatal.
export const KNOWN_TOP_LEVEL_SEGMENTS = new Set([
  ...prefixedLocales,
  ...Object.values(shopCategorySlugs),
  "admin",
  "api",
  "design-system",
  "about",
  "care",
  "careers",
  "cart",
  "checkout",
  "collections",
  "colours",
  "contact",
  "cookies-policy",
  "designers",
  "faq",
  "order-status",
  "payment-delivery",
  "privacy-policy",
  "products",
  "projects",
  "public-offer",
  "resources",
  "returns",
  "samples",
  "search",
  "shop",
  "terms-of-use",
  "warranty",
]);

const categorySlugs = new Set<string>(Object.values(shopCategorySlugs));

/**
 * Known segments that own a folder but no index page of their own — so the
 * bare segment is a real URL to nobody.
 *
 * `/products/<slug>` exists; `/products` never did. It used to 404 for free,
 * because nothing matched it. Now the top-level `[category]` catch-all does,
 * and it would answer with a streamed soft 404 — the one hole a
 * "known segment ⇒ leave it alone" rule opens. Listed rather than inferred
 * because the proxy has no filesystem; `proxy.test.ts` derives the same list
 * from disk and fails if the two disagree, so adding a `products/page.tsx`
 * (or a second index-less folder) cannot silently rot this.
 */
export const SEGMENTS_WITHOUT_INDEX_PAGE = new Set(["products"]);

/**
 * Known segments that have a child route of their own, and so legitimately
 * answer at two segments deep.
 *
 * The counterpart to the set above, and needed for the same reason. It is
 * tempting to assume a second segment under a real first one either matches
 * that route's own children or matches nothing — but `[category]/[subcategory]`
 * is *also* two segments at the root, so it catches `/about/xyz`,
 * `/faq/anything`, `/shop/outdoor` and every other two-segment miss, turning
 * what used to be a filesystem 404 into a streamed soft 404. Only these three
 * folders have children; everything else is a one-segment route and says so.
 *
 * What happens *inside* them is still their own business: `/products/nonsense`
 * reaches the products route and gets its `notFound()`, streamed `200` and all.
 * Validating slugs here would mean a database lookup on every request.
 */
export const SEGMENTS_WITH_CHILD_ROUTES = new Set([
  "collections",
  "products",
  "projects",
]);

/** `<categorySlug>/<subcategorySlug>` for the three subcategory pages that
 *  exist — built from the same table the route reads, so it cannot drift. */
const subcategoryPaths = new Set(
  shopSubcategories.map(
    (sub) => `${shopCategorySlugs[sub.category]}/${sub.slug}`,
  ),
);

/**
 * Does any route actually serve this (locale-stripped) path?
 *
 * ## Why the proxy has to answer this at all
 *
 * `notFound()` inside a page can no longer produce a `404` *status*. There is a
 * `loading.tsx` at `src/app/[locale]/`, so every route under it renders inside
 * a Suspense boundary; the moment that fallback flushes, the `200` headers are
 * already on the wire and cannot be taken back. Next documents the consequence
 * and the remedy (`loading.md` §"Status Codes"): the body is still marked
 * `noindex`, so nothing gets indexed, but crawlers log a *soft 404* — and to
 * get a real one you must "ensure the resource exists before the response body
 * is streamed… run this check in `proxy`".
 *
 * That was survivable while every unknown URL simply matched no route at all
 * and fell through to the filesystem 404. Moving the categories to the top
 * level ended that: `/[category]` and `/[category]/[subcategory]` are dynamic
 * segments at the *root* of the site, so they now match every one- and
 * two-segment URL in existence. `/definitely-not-a-page` stopped being
 * "unmatched" and started being "matched, then `notFound()`" — i.e. a streamed
 * `200`. This function restores the old contract by doing the matching up
 * front, before anything can stream.
 *
 * ## The rule
 *
 * Only the paths this catch-all newly swallowed are judged here. Everything
 * else is passed through untouched and keeps policing itself — `/products/bad`
 * is still the products route's business, not the proxy's.
 *
 * Note that this promotes `KNOWN_TOP_LEVEL_SEGMENTS` from an optimisation
 * ("skip the redirects lookup") to a routing decision: a route folder missing
 * from it is now a hard 404 rather than a wasted query. `proxy.test.ts`
 * already fails on exactly that drift, which is why the list can carry the
 * extra weight.
 */
export function isServedPath(segments: string[]): boolean {
  // The locale root — `/`, `/en`, `/pl` — is `[locale]/page.tsx`.
  if (segments.length === 0) return true;

  const [first, second] = segments;

  // Not a segment any route owns. The legacy-redirect lookup has already had
  // its turn by this point, so there is nothing left for this to be.
  if (!KNOWN_TOP_LEVEL_SEGMENTS.has(first)) return false;

  if (segments.length === 1) return !SEGMENTS_WITHOUT_INDEX_PAGE.has(first);

  if (segments.length === 2) {
    return categorySlugs.has(first)
      ? subcategoryPaths.has(`${first}/${second}`)
      : SEGMENTS_WITH_CHILD_ROUTES.has(first);
  }

  // Nothing in the app is three segments deep — the deepest `page.tsx` under
  // `[locale]/` is a child of a child. `/admin/…`, `/design-system/…` and
  // `/api/…` are the exceptions and never reach here: the first two return
  // above, the third is excluded by `config.matcher`.
  return false;
}

/**
 * The slash-stripping redirect Next would have issued, reissued here.
 *
 * `308` rather than `301` to match what Next itself sent before
 * `skipTrailingSlashRedirect`: a permanent redirect that preserves the
 * method, so a `POST` to `/contact/` is not silently downgraded to a `GET`.
 *
 * Built from a plain `URL`, **not** `request.nextUrl.clone()`, and that is
 * not a style preference — the clone cannot express this redirect at all.
 * `NextURL` records whether the incoming path had a trailing slash once, in
 * `analyze()` at construction, and its `href` getter re-applies that flag
 * through `formatNextPathnameInfo` every time it serialises. Its `pathname`
 * setter writes only the inner URL and never re-runs `analyze()`. So on a
 * request for `/shop/` the clone answers `/shop/` no matter what pathname is
 * assigned to it, and `NextResponse.redirect` — which serialises via `href` —
 * emits `Location: /shop/`: an infinite loop on every live page Google has
 * indexed with a slash. Verified on the wire before this comment was written.
 *
 * The query string is copied over by hand for the same reason: `new URL(path,
 * base)` keeps only the base's origin, so `?page=2` would otherwise be
 * dropped by the hop.
 */
export function redirectToCanonical(request: NextRequest, pathname: string) {
  const url = new URL(pathname, request.url);
  url.search = request.nextUrl.search;
  return NextResponse.redirect(url, 308);
}

export async function proxy(request: NextRequest) {
  const requestedPath = request.nextUrl.pathname;

  /**
   * Trailing-slash normalisation is this function's job now
   * (`skipTrailingSlashRedirect` in `next.config.ts`), and the reason is the
   * migration.
   *
   * Every URL Google has indexed for odudlab.com ends in a slash — Horoshop
   * wrote them that way, so all 162 of them do. Next's built-in normalisation
   * runs *before* proxy, which meant each one paid two hops:
   * `/oplata-i-dostavka/` → `308` → `/oplata-i-dostavka` → `301` →
   * `/payment-delivery`. That is every single legacy URL on the site, and a
   * redirect chain is the one thing a migration cannot afford to be casual
   * about: Google follows it, but it spends crawl budget doing so, and each
   * extra hop is another place for a future edit to break the chain into a
   * dead end. Taking the normalisation into the proxy lets the answer be
   * given once — `/oplata-i-dostavka/` → `301` → `/payment-delivery`.
   *
   * The cost is that the slash-stripping redirect for *live* routes has to be
   * reissued by hand further down, because turning the flag on turns it off
   * for everything. Skipping that would be a duplicate-content bug, not a
   * cosmetic one: `/shop/` and `/shop` would both render the shop.
   */
  const hasTrailingSlash =
    requestedPath.length > 1 && requestedPath.endsWith("/");
  const pathname = hasTrailingSlash
    ? requestedPath.replace(/\/+$/, "") || "/"
    : requestedPath;

  // Dev-only tooling route — not part of the localised site, never rewritten.
  if (pathname === "/design-system" || pathname.startsWith("/design-system/")) {
    return hasTrailingSlash
      ? redirectToCanonical(request, pathname)
      : NextResponse.next();
  }

  // Admin panel — its own root layout with Payload's own uk/en/pl
  // localization, never part of the public site's locale rewriting.
  if (pathname === "/admin" || pathname.startsWith("/admin/")) {
    return hasTrailingSlash
      ? redirectToCanonical(request, pathname)
      : NextResponse.next();
  }

  const localePrefix = prefixedLocales.find(
    (locale) => pathname === `/${locale}` || pathname.startsWith(`/${locale}/`),
  );

  // Everything below is judged on the bare path, so `/en/riflo` gets the same
  // answer as `/riflo`. `/en` itself is the locale root and survives as `""`.
  const barePath = localePrefix
    ? pathname.slice(`/${localePrefix}`.length)
    : pathname;
  const segments = barePath.split("/").filter(Boolean);

  /**
   * The Horoshop template's demo catalogue — `/iphone-13`, `/shampoo`, the
   * six demo brands — which was indexed alongside the real one and has no
   * successor to redirect to. `410` rather than `404` because these are
   * gone deliberately and permanently; see `src/lib/gone-paths.ts` for why
   * that distinction is worth the branch.
   *
   * Checked *before* the redirects lookup on purpose. `/brands` still has a
   * `Redirects` row from when it was going to 301 to `/shop`, and this is
   * what makes that row inert rather than a competing answer — the same
   * short-circuit `KNOWN_TOP_LEVEL_SEGMENTS` gives the category slugs.
   */
  if (isGonePath(barePath)) {
    return new NextResponse(renderGonePage(localePrefix ?? defaultLocale), {
      status: 410,
      headers: {
        "content-type": "text/html; charset=utf-8",
        // Nothing here is ever going to change, and a crawler that caches it
        // is a crawler that stops asking — which is the goal.
        "cache-control": "public, max-age=3600, s-maxage=86400",
        "x-robots-tag": "noindex",
      },
    });
  }

  /**
   * Legacy Horoshop URL? The `Redirects` rows are stored *unprefixed*
   * (`/riflo`, `/pro-nas`) because that is the form the old site's Ukrainian
   * pages had — but every one of them also existed under `/en/`, and those 58
   * URLs used to fall straight through, because the old first-segment test saw
   * `en` in `KNOWN_TOP_LEVEL_SEGMENTS` and skipped the lookup entirely.
   * Matching on the bare path and putting the prefix back on the target fixes
   * all of them with no second set of rows to maintain.
   *
   * The target keeps the visitor's language rather than dumping them on the
   * Ukrainian page: `/en/riflo` → `/en/products/riflo`. `en`/`pl` are
   * `noindex` for now, so a crawler following this will simply drop the old
   * URL — which is the correct outcome while the English site is unfinished,
   * and the redirect is already right for the day it isn't.
   *
   * Skipped when the first segment is a live route, which is what keeps the
   * fossil `/rakovyny → /shop/sinks` row from 301ing the category away from
   * itself.
   */
  if (segments.length > 0 && !KNOWN_TOP_LEVEL_SEGMENTS.has(segments[0])) {
    const legacyRedirect = await findLegacyRedirect(barePath);
    if (legacyRedirect) {
      // `/blog → /` under a prefix would compose `/en/`, which Next then 308s
      // to `/en` — a wasted hop on a redirect that is already a hop. Trimming
      // the root slash before concatenating avoids it; unprefixed, `/` is
      // already the shortest form of itself.
      const target = new URL(
        localePrefix
          ? `/${localePrefix}${legacyRedirect.toPath === "/" ? "" : legacyRedirect.toPath}`
          : legacyRedirect.toPath,
        request.url,
      );

      // Carry the incoming query string over the hop. A `gclid` or `utm_*`
      // landing on an old URL has to survive the 301 or the click becomes
      // unattributable — the redirect would quietly cost us the measurement
      // the whole ads setup exists for. The target's own query wins on a
      // collision (`/do-domu → /vazony?placement=indoor` must stay filtered).
      for (const [key, value] of request.nextUrl.searchParams) {
        if (!target.searchParams.has(key)) {
          target.searchParams.append(key, value);
        }
      }

      return NextResponse.redirect(target, legacyRedirect.statusCode);
    }
  }

  if (!isServedPath(segments)) {
    /**
     * Answered here, in full, rather than rewritten to a route — and the
     * distinction is the whole point of this branch.
     *
     * It used to be `NextResponse.rewrite("/_not-found")`, on the premise
     * that Next's own not-found entry carries a real `404`. Under `next
     * start` it does. On Vercel it does not: `/_not-found` is statically
     * prerendered (`x-nextjs-prerender: 1`), so the platform serves the file
     * straight off the edge and never runs the server code that would have
     * set the status. Every unknown URL on the deployed site came back
     * `200` — and worse than a soft 404, because that prerendered document
     * carries no `<meta name="robots">` at all. `/anything-at-all` was an
     * indexable duplicate of the 404 page, unlimited in number. Measured on
     * the wire against production with a cache MISS, not inferred.
     *
     * A status cannot be attached to a rewrite, and no `page.tsx` can set
     * one either once `loading.tsx` has flushed (see `isServedPath` above),
     * so the response has to be built here. This is the second of the two
     * shapes Next documents for exactly this case: "run this check in
     * `proxy` to rewrite missing slugs to a not-found route, *or produce a
     * 404 response*" (`loading.md` §"Status Codes"). The 410 branch above
     * has been built this way from the start; this now matches it.
     *
     * No redirect: the address the visitor typed is the address that stays
     * in the bar and in the logs.
     */
    return new NextResponse(renderNotFoundPage(localePrefix ?? defaultLocale), {
      status: 404,
      headers: {
        "content-type": "text/html; charset=utf-8",
        // Not cached, unlike the 410. That list is a closed historical fact;
        // this one is "no route owns it *yet*" — a new product slug, a new
        // category, a redirect row added in the admin. A cached 404 would
        // outlive the reason for it.
        "cache-control": "no-store",
        // The site-wide `X-Robots-Tag` in next.config.ts disappears the day
        // indexing is switched on, so the 404 says `noindex` for itself.
        "x-robots-tag": "noindex",
      },
    });
  }

  // A real page, asked for with a slash it does not have. This is the one
  // 308 that survives `skipTrailingSlashRedirect`, and it has to: without it
  // `/shop/` and `/shop` are two URLs serving one page. It runs last so that
  // the answers above — 410, 301, 404 — are given in a single hop, which is
  // the whole point of taking the normalisation over.
  if (hasTrailingSlash) {
    return redirectToCanonical(request, pathname);
  }

  if (localePrefix) {
    return NextResponse.next();
  }

  const url = request.nextUrl.clone();
  url.pathname = `/${defaultLocale}${pathname}`;
  return NextResponse.rewrite(url);
}

export const config = {
  matcher: [
    "/((?!api|_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|webp|avif|ico|txt|xml)$).*)",
  ],
};
