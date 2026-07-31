import type { MetadataRoute } from "next";
import { locales } from "@/i18n/config";
import { localeHref } from "@/lib/locale-href";
import { getSiteUrl } from "@/lib/site-url";
import { getAllProductsAsync } from "@/lib/products";
import { getAllCollections } from "@/lib/collections";
import { shopCategories } from "@/lib/schemas/product";

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
 * - Every `PlaceholderPage` route (`/about`, `/care`, `/careers`,
 *   `/colours`, `/cookies-policy`, `/designers`, `/faq`,
 *   `/payment-delivery`, `/privacy-policy`, `/projects[/[slug]]`,
 *   `/public-offer`, `/resources`, `/returns`, `/samples`,
 *   `/terms-of-use`) — no real content yet, also explicitly `noindex`. See
 *   `CONTENT_CHECKLIST.md` for what each is waiting on. `/contact` is NOT
 *   in this list: it now has real, owner-confirmed content and is indexable,
 *   so it appears in `staticPaths` below.
 * - `/admin`, `/design-system` — not part of the public site.
 *
 * Every URL is emitted once per locale (`localeHref` gives the unprefixed
 * `uk` path and the prefixed `en`/`pl` paths), with each entry's
 * `alternates.languages` pointing at its sibling-locale versions — this is
 * the sitemap-level counterpart to the `alternates.languages` (hreflang)
 * already set in each page's own `generateMetadata`.
 */
export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const siteUrl = getSiteUrl();
  const products = await getAllProductsAsync();
  const collections = getAllCollections();

  const staticPaths = [
    "/",
    "/shop",
    "/collections",
    "/warranty",
    "/contact",
    ...shopCategories.map((c) => `/shop/${c}`),
  ];
  const productPaths = products.map((product) => `/products/${product.slug}`);
  const collectionPaths = collections.map(
    (collection) => `/collections/${collection.slug}`,
  );

  const allPaths = [...staticPaths, ...productPaths, ...collectionPaths];

  const entries: MetadataRoute.Sitemap = [];
  for (const path of allPaths) {
    for (const locale of locales) {
      entries.push({
        url: new URL(localeHref(locale, path), siteUrl).toString(),
        alternates: {
          languages: Object.fromEntries(
            locales.map((altLocale) => [
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

  return entries;
}
