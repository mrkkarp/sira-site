import type { MetadataRoute } from "next";
import { localeHref } from "@/lib/locale-href";
import { getSiteUrl } from "@/lib/site-url";
import { getAllProductsAsync } from "@/lib/products";
import { getAllCollections } from "@/lib/collections";
import {
  shopCategories,
  shopCategoryPath,
  shopSubcategories,
} from "@/lib/schemas/product";
import { getInfoPageContent } from "@/content/info-pages";
import { getPublishedProjects, projectPath } from "@/content/projects";
import { indexableLocales } from "@/lib/seo/indexing";

/**
 * `sitemap.xml` (Prompt 9 §4 — SEO audit: "жоден sitemap не існує" gap).
 *
 * Deliberately lists only routes that are actually indexable today — every
 * route here has real content and `robots: { index: true }` (the default)
 * in its own `generateMetadata`. Everything intentionally excluded has a
 * concrete reason, matching each route's own metadata:
 *
 * - `/cart`, `/checkout`, `/order-status`, `/search` — utility/per-session
 *   pages, explicitly `noindex` (see `src/lib/seo/placeholder-metadata.ts`
 *   and `search/page.tsx`).
 * - `/payment-delivery`, `/returns`, `/care`, `/colours`, `/faq` are now
 *   indexable, but ONLY for the locales that have real body content. Their
 *   Ukrainian versions have real prose (see `src/content/info-pages.ts`), so
 *   `uk` is indexable and listed. There is no English or Polish source for any
 *   of them, so `en`/`pl` fall back to the `noindex` `PlaceholderPage` and must
 *   NOT appear here — hence these five are handled as locale-limited paths
 *   below (emitted only for content-bearing locales) rather than in the
 *   all-locale `staticPaths`.
 * - Every remaining `PlaceholderPage` route (`/careers`,
 *   `/cookies-policy`,
 *   `/privacy-policy`,
 *   `/public-offer`, `/resources`,
 *   `/terms-of-use`) — no real content yet, also explicitly `noindex`. See
 *   `CONTENT_CHECKLIST.md` for what each is waiting on. `/about`, `/contact`,
 *   `/designers`, `/samples` and `/projects[/[slug]]` are NOT in this list:
 *   they now have real content, so they appear in `staticPaths` and
 *   `projectPaths` below.
 * - `/admin`, `/design-system` — not part of the public site.
 * - `/<category>` (and `/<category>/<subcategory>`) for anything with no
 *   products yet — a soft 404 to a crawler, and `noindex` in its own
 *   metadata. Filtered out below, and it returns on its own once it has
 *   stock.
 *
 * Every URL is emitted once per **indexable** locale (`indexableLocales` in
 * `src/lib/seo/indexing.ts` — today `uk` only), with each entry's
 * `alternates.languages` pointing at its sibling indexable-locale versions —
 * this is the sitemap-level counterpart to the `alternates.languages`
 * (hreflang) already set in each page's own `generateMetadata`. The `en`/`pl`
 * routes render Ukrainian fallback content and are `noindex`, so they must
 * never appear in the sitemap or as hreflang alternates. Locale-limited paths
 * follow the same shape but further restrict to the locales that have an
 * indexable version of that specific page.
 */
export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const siteUrl = getSiteUrl();
  const products = await getAllProductsAsync();
  const collections = getAllCollections();

  /**
   * Only categories that actually have something in them. A category with no
   * products still renders a real page — the "coming soon" empty state in
   * `shop-empty-state.tsx` — but to a crawler that is a soft 404: a 200
   * response whose body is a promise rather than the listing the URL claims.
   * `wall-modules` is exactly this today. Listing it in the sitemap is an
   * explicit "please index this", which contradicts the `noindex` its own
   * `generateMetadata` sets (`[category]/page.tsx`). Both conditions read
   * the same product list, so the category re-appears here and drops its
   * `noindex` together, the moment a product lands in it — no code change, no
   * checklist to remember.
   *
   * Paths come from `shopCategoryPath`, the same helper the routes and the
   * navigation use, so the sitemap can never drift from the addresses the site
   * actually serves (`/rakovyny`, not `/shop/sinks`).
   */
  const nonEmptyCategoryPaths = shopCategories
    .filter((category) =>
      products.some((product) => product.shopCategory === category),
    )
    .map((category) => shopCategoryPath(category));

  /**
   * The three subcategories are *pages*, not query strings — each has its own
   * route, `h1`, intro and canonical (`src/lib/schemas/product-categories.ts`
   * documents why exactly these three), so each belongs in the sitemap on its
   * own. The same emptiness rule applies for the same reason: the facet match
   * is duplicated from `getProductsBySubcategory`, which the route's own
   * soft-404 `noindex` guard uses, so listing and indexability stay in step.
   */
  const nonEmptySubcategoryPaths = shopSubcategories
    .filter((subcategory) =>
      products.some(
        (product) =>
          product.shopCategory === subcategory.category &&
          (subcategory.facet === "mount"
            ? product.sinkType === subcategory.value
            : product.planterPlacement === subcategory.value),
      ),
    )
    .map((subcategory) =>
      shopCategoryPath(subcategory.category, subcategory.slug),
    );

  const staticPaths = [
    "/",
    "/shop",
    "/collections",
    "/warranty",
    "/about",
    "/contact",
    "/designers",
    "/samples",
    "/projects",
    ...nonEmptyCategoryPaths,
    ...nonEmptySubcategoryPaths,
  ];
  /**
   * Only *published* projects — `getPublishedProjects` drops any record with
   * no photographs, which is the same condition the route itself renders on.
   * The index page is listed unconditionally: even at zero projects it is a
   * real page with real prose, unlike an empty category.
   */
  const projectPaths = getPublishedProjects().map((project) =>
    projectPath(project.slug),
  );
  const productPaths = products.map((product) => `/products/${product.slug}`);
  const collectionPaths = collections.map(
    (collection) => `/collections/${collection.slug}`,
  );

  const allPaths = [
    ...staticPaths,
    ...productPaths,
    ...collectionPaths,
    ...projectPaths,
  ];

  /**
   * Info-page routes that are indexable for some but not all locales. Each is
   * emitted only for the locales that have real content (today: `uk` only —
   * the `en` bodies are empty and there is no `pl` source), so the `noindex`
   * placeholder versions never leak into the sitemap.
   */
  const localeLimitedPaths = [
    "/payment-delivery",
    "/returns",
    "/care",
    "/colours",
    "/faq",
  ].map((path) => ({
    path,
    locales: indexableLocales.filter((locale) =>
      getInfoPageContent(path.slice(1), locale),
    ),
  }));

  const entries: MetadataRoute.Sitemap = [];
  for (const path of allPaths) {
    for (const locale of indexableLocales) {
      entries.push({
        url: new URL(localeHref(locale, path), siteUrl).toString(),
        alternates: {
          languages: Object.fromEntries(
            indexableLocales.map((altLocale) => [
              altLocale,
              new URL(localeHref(altLocale, path), siteUrl).toString(),
            ]),
          ),
        },
        changeFrequency: path === "/" ? "weekly" : "monthly",
        priority: path === "/" ? 1 : path.startsWith("/products/") ? 0.7 : 0.5,
      });
    }
  }

  for (const { path, locales: pathLocales } of localeLimitedPaths) {
    for (const locale of pathLocales) {
      entries.push({
        url: new URL(localeHref(locale, path), siteUrl).toString(),
        alternates: {
          languages: Object.fromEntries(
            pathLocales.map((altLocale) => [
              altLocale,
              new URL(localeHref(altLocale, path), siteUrl).toString(),
            ]),
          ),
        },
        changeFrequency: "monthly",
        priority: 0.5,
      });
    }
  }

  return entries;
}
