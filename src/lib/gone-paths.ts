import type { Locale } from "@/i18n/config";
import { clientStrings } from "@/i18n/client-strings";
import { renderStatusPage } from "@/lib/status-page";

/**
 * Old Horoshop URLs that must answer `410 Gone` — never `301`, never `404`.
 *
 * ## What these are
 *
 * The old site shipped on a Horoshop template and the template's own demo
 * catalogue was never deleted. It sat there, indexed, alongside the real
 * one: `/iphone-13/`, `/shampoo/`, `/womens-fashion/`, `/bath-salt/`. All 34
 * paths below come straight out of the site's own sitemaps
 * (`_horoshop-export/sitemap-pages.xml` and `sitemap-brands.xml`) — none was
 * typed from memory, and `gone-paths.test.ts` re-derives them from those
 * files on every run.
 *
 * They are demo *shells*, not thin content: the real catalogue has exactly
 * twelve categories (`horoshop-yml.xml`), and not one of these is among
 * them. `/furniture/`, `/light/`, `/candles/` and `/textile/` read like they
 * could belong to a concrete-furniture brand, which is precisely why they
 * are called out here — they are template categories with zero products,
 * same as `/monoblocks/`.
 *
 * ## Why 410 and not 301
 *
 * A 301 asserts "this content moved *there*". There is nowhere honest to
 * point: `/hair-spray/ → /shop` is a lie about relevance, and Google treats
 * a redirect to an unrelated page as a soft 404 anyway — so it costs a
 * crawl budget and buys nothing. A 410 is the unambiguous "this is gone,
 * stop asking", and it drops out of the index faster than a 404 does.
 *
 * A 404 would be *nearly* right, but it means "not found, maybe later".
 * These are never coming back, and saying so is the whole point: it is the
 * difference between 56 URLs being re-crawled for months and being retired.
 *
 * ## Why the *other* dead URLs are 301s
 *
 * `src/lib/legacy-url-map.ts` handles 466 pre-Horoshop addresses and answers
 * every one of them with a `301` — no `410`s at all. The two files look like
 * they contradict each other. They don't, because the URLs are not the same
 * kind of thing.
 *
 * These 34 are a *template's* demo catalogue. ODUDLAB never sold an iPhone,
 * never sold shampoo, and `/apple/` was never its brand. Nobody has ever
 * arrived on one of them looking for ODUDLAB, so there is no visitor to
 * rescue and nothing on the site that is "similar" — the honest answer is
 * that the page was never real.
 *
 * The 466 are the opposite: real products the workshop really made, at
 * addresses that are still linked and still clicked. The owner's rule for
 * them is «ідентичні або схожі сторінки… якщо немає — на головну», and it is
 * the right rule for that set — a discontinued planter has a planters
 * category behind it, and a person who followed a three-year-old link should
 * land on it rather than on a tombstone. It costs something (a mass 301 to
 * `/` reads to Google as a soft 404, so index-wise those behave much like
 * the 404s they replace) and buys something (nobody hits a dead end), and
 * for pages that were once real that trade is worth making. For a demo
 * iPhone it isn't.
 *
 * ## Why a constant and not a `Redirects` row
 *
 * `Redirects` models a redirect — it requires a `toPath`, and a 410 has no
 * target. More to the point, this list is a closed historical fact: the old
 * site is frozen, so no one will ever need to add a row from the admin UI.
 * Keeping it in code means the check is a `Set` lookup that runs *before*
 * the redirects lookup in `proxy.ts`, so these 68 URLs never cost a database
 * round-trip at all.
 */
export const GONE_PATHS: ReadonlySet<string> = new Set([
  // Horoshop demo *categories* — the template's own storefront, left indexed.
  "/accessories",
  "/bath-salt",
  "/body-care",
  "/candles",
  "/computers-and-laptops",
  "/face-care",
  "/face-cream",
  "/furniture",
  "/hair-care",
  "/hair-spray",
  "/hand-cream",
  "/iphone-11",
  "/iphone-12",
  "/iphone-13",
  "/iphone-se",
  "/laptops",
  "/light",
  "/mens-fashion",
  "/milk-body-cleanser",
  "/milk-face-cleanser",
  "/monoblocks",
  "/shampoo",
  "/smart-watch",
  "/smartphones",
  "/textile",
  "/tonal-cream",
  "/womens-fashion",

  // The brand feature: an index plus six demo brands (`/apple/`, `/clothes/`
  // …). ODUDLAB makes everything it sells, so there is no brand concept to
  // migrate — the index is as gone as the brands under it.
  "/brands",
  "/apparel",
  "/apple",
  "/clothes",
  "/homedeco",
  "/lights",
  "/skusu",
]);

/**
 * Judged on the locale-stripped path, so `/en/iphone-13` is as gone as
 * `/iphone-13` — every one of these had an `/en/` twin in the old sitemap.
 */
export function isGonePath(barePath: string): boolean {
  return GONE_PATHS.has(barePath);
}

/**
 * The body served with the 410.
 *
 * Hand-written rather than a React route because the status is the entire
 * payload here: a `page.tsx` cannot set 410 (only `notFound()`'s 404), and
 * routing through a handler just to render three lines of text would add a
 * rewrite hop to a response no human is likely to see — these are demo URLs
 * for products the brand never sold. It still has to be a *real* page for
 * the few that do: correct `lang`, `noindex` so the tombstone itself is not
 * indexed, and a way back into the catalogue.
 *
 * The document itself lives in `@/lib/status-page` — the proxy's `404` needs
 * exactly the same self-contained shell, for exactly the same reason, and
 * two copies of one inline stylesheet would drift the first time either is
 * touched. The 410 sends people to the catalogue rather than the homepage:
 * these are all product URLs, so the useful answer is "here is what we
 * actually make".
 */
export function renderGonePage(locale: Locale): string {
  const { gone } = clientStrings[locale];
  return renderStatusPage({
    locale,
    eyebrow: gone.eyebrow,
    title: gone.title,
    body: gone.body,
    cta: gone.cta,
    ctaPath: "/shop",
  });
}
