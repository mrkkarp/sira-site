import type { Locale } from "@/i18n/config";
import { clientStrings } from "@/i18n/client-strings";
import { localeHref } from "@/lib/locale-href";

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
 * Self-contained on purpose. The proxy runs on the Edge runtime with no
 * access to `globals.css` or the font pipeline, so the colours are inlined
 * from the same tokens (`--color-background`, `--color-text`,
 * `--color-text-muted`) and the type falls back to the system stack.
 */
export function renderGonePage(locale: Locale): string {
  const { gone, siteName } = clientStrings[locale];
  return `<!doctype html>
<html lang="${locale}">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<meta name="robots" content="noindex">
<title>${gone.title} — ${siteName}</title>
<style>
:root { color-scheme: light }
body { margin:0; min-height:100vh; display:flex; align-items:center;
  background:#f1eee7; color:#1d1d1b;
  font-family: ui-sans-serif, system-ui, -apple-system, "Segoe UI", sans-serif;
  line-height:1.5 }
main { max-width:38rem; margin:0 auto; padding:6rem 1.5rem }
.eyebrow { margin:0; font-size:.75rem; letter-spacing:.12em; text-transform:uppercase; color:#68655f }
h1 { margin:.5rem 0 0; font-size:clamp(1.75rem, 5vw, 2.5rem); font-weight:500; letter-spacing:-.01em }
p.body { margin:.75rem 0 0; color:#68655f }
a { display:inline-block; margin-top:2rem; padding:.75rem 1.5rem;
  border:1px solid #1d1d1b; border-radius:999px; color:#1d1d1b; text-decoration:none }
a:hover { background:#1d1d1b; color:#f1eee7 }
</style>
</head>
<body>
<main>
<p class="eyebrow">${gone.eyebrow}</p>
<h1>${gone.title}</h1>
<p class="body">${gone.body}</p>
<a href="${localeHref(locale, "/shop")}">${gone.cta}</a>
</main>
</body>
</html>`;
}
