import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { getAllProductsAsync } from "@/lib/products";
import { getAllProductColours } from "@/lib/product-colours";
import { isLocale, defaultLocale } from "@/i18n/config";
import { getDictionary } from "@/i18n/get-dictionary";
import { localeHref } from "@/lib/locale-href";
import { searchCatalog } from "@/lib/search";

export type SearchProductResult = {
  slug: string;
  name: string;
  category: string;
  price: number;
  photo: string;
};

export type SearchPageResult = {
  title: string;
  href: string;
};

export type SearchResponse = {
  products: SearchProductResult[];
  collections: SearchPageResult[];
  projects: SearchPageResult[];
  pages: SearchPageResult[];
};

const MAX_RESULTS_PER_GROUP = 6;

/**
 * Let the CDN answer repeat searches instead of the function.
 *
 * This route is called from the header drawer on a 250 ms debounce, so one
 * person typing "раковина" fires several requests — one per prefix they pause
 * on — and every visitor typing the same word fires the same ones again.
 * Measured against production before this header existed, every single request
 * was `x-vercel-cache: MISS` at 0.5–1.7 s: the response said
 * `public, max-age=0, must-revalidate`, so nothing was ever reusable and each
 * keystroke woke a function in `iad1`.
 *
 * The response depends on nothing but the URL — `q` and `locale` are the only
 * inputs, there is no cookie, no session, no personalisation — so the full URL
 * is a correct cache key and the CDN can serve prefixes people have already
 * typed without involving us at all.
 *
 * On the numbers:
 *  - `s-maxage=300` matches the `revalidate: 300` on the catalogue's own data
 *    cache (`payload-flat-products.ts`), so the edge is never staler than the
 *    layer underneath it. It cannot be longer *and* honest: the CDN does not
 *    observe `revalidateTag`, so an admin edit clears our data cache
 *    immediately and the edge keeps its copy until this expires
 *    (`cdn-caching.md:26`). Five minutes of a possibly-old price in a drawer
 *    preview, with the product page itself correct, is the trade being made
 *    here — deliberately, and it is the reason this number is not an hour.
 *  - `stale-while-revalidate=600` lets the refresh happen behind a visitor who
 *    already got their answer, instead of in front of them.
 *  - `max-age=60` in the browser is for one specific motion: backspacing.
 *    Deleting a letter re-requests a query the same tab asked for seconds ago.
 *
 * Not `export const dynamic = 'force-static'`, which is the documented way to
 * cache a GET handler (`15-route-handlers.md:51`) and is useless here: it
 * forces `searchParams` to empty, so every search would be a search for "".
 * And not `unstable_cache` around the query itself — its key space would be
 * every string anyone ever types, which is not a cache, it is a leak with a
 * TTL. The expensive shared part (the catalogue) is already cached by tag one
 * layer down; what is left per request is CPU over 38 products.
 */
const SEARCH_CACHE_CONTROL =
  "public, max-age=60, s-maxage=300, stale-while-revalidate=600";

function searchResponse(body: SearchResponse) {
  return NextResponse.json(body, {
    headers: { "cache-control": SEARCH_CACHE_CONTROL },
  });
}

export async function GET(request: NextRequest) {
  const { searchParams } = request.nextUrl;
  const query = searchParams.get("q") ?? "";
  const localeParam = searchParams.get("locale") ?? defaultLocale;
  const locale = isLocale(localeParam) ? localeParam : defaultLocale;

  if (!query.trim()) {
    return searchResponse({
      products: [],
      collections: [],
      projects: [],
      pages: [],
    });
  }

  const dictionary = await getDictionary(locale);
  const { products, pages } = searchCatalog(query, {
    products: await getAllProductsAsync(locale),
    colours: getAllProductColours(),
    dictionary,
    limit: MAX_RESULTS_PER_GROUP,
  });

  // No real collections/projects data exists yet (see src/lib/schemas/collection.ts
  // and project.ts) — these groups are structurally ready but always empty
  // until real content is added.
  return searchResponse({
    products: products.map((product): SearchProductResult => ({
      slug: product.slug,
      name: product.name,
      category: product.sourceCategory,
      price: product.base.price,
      photo: product.base.photo,
    })),
    collections: [],
    projects: [],
    pages: pages.map((page): SearchPageResult => ({
      title: page.title,
      href: localeHref(locale, page.href),
    })),
  });
}
