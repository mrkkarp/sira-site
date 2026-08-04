import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { isLocale } from "@/i18n/config";
import { getDictionary } from "@/i18n/get-dictionary";
import { isIndexable } from "@/lib/seo/indexing";
import { pageSeo } from "@/lib/seo/page-seo";
import { shopCategoryFromSlug, shopCategoryPath } from "@/lib/schemas/product";
import { getProductsByCategory, preloadProducts } from "@/lib/products";
import {
  shopCategoryLabel,
  shopCategoryIntro,
} from "@/lib/shop-category-label";
import { ShopCatalog } from "@/components/shop/shop-catalog";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string; category: string }>;
}): Promise<Metadata> {
  const { locale, category: slug } = await params;
  if (!isLocale(locale)) return {};
  const category = shopCategoryFromSlug(slug);
  if (!category) return {};
  const dictionary = await getDictionary(locale);
  const title = shopCategoryLabel(category, dictionary);
  const description = shopCategoryIntro(category, dictionary);

  /**
   * A category with nothing in it yet renders a deliberate "coming soon" empty
   * state (`shop-empty-state.tsx`) — a real page, but with no product content.
   * To a crawler that is a soft 404: a 200 response whose body is a promise
   * rather than the thing the URL claims to list. `wall-modules` is exactly
   * this today. Marked `noindex` until it has stock. It also drops out of the
   * sitemap (see `src/app/sitemap.ts`), and both come back on their own the
   * moment a product lands in the category — no code change, no checklist to
   * remember.
   *
   * `follow` is deliberately tied to `isIndexable(locale)` rather than hard
   * `true`. A page's own `robots` *replaces* the root layout's wholesale (see
   * `src/lib/seo/indexing.ts`), so a hard `true` would quietly upgrade the
   * layout's `nofollow` to `follow` on exactly the surfaces that must not get
   * it — `en`/`pl`, previews, and while the pre-launch `SEO_NOINDEX`
   * kill-switch is on. Written this way the override only ever *adds*
   * `noindex`: where the site is indexable it says "skip this page, keep
   * crawling the nav through it", and everywhere else it stays byte-identical
   * to what the layout already emits.
   */
  await preloadProducts(locale);
  const products = getProductsByCategory(category);
  const isEmpty = products.length === 0;

  return {
    title,
    description,
    ...(isEmpty
      ? { robots: { index: false, follow: isIndexable(locale) } }
      : {}),
    ...pageSeo({
      locale,
      path: shopCategoryPath(category),
      title,
      description,
      siteName: dictionary.site.name,
      // Share the category with something *from* the category. The products
      // are already loaded for the soft-404 check above, so this costs nothing
      // and beats the generic workshop card: someone forwarding "Умивальники"
      // sees a basin. Empty categories fall through to the default — they are
      // `noindex` anyway, and there is nothing truthful to show.
      image: products[0]?.base.photo,
    }),
  };
}

/**
 * `/<category>` — one dynamic route for all 7 real `ShopCategory` values, at
 * the *top level* of the site rather than under `/shop`.
 *
 * The segment is a Ukrainian slug (`/rakovyny`, `/vazony`, …) rather than the
 * internal identifier, because those are the addresses the old odudlab.com
 * served the same listings at: keeping them means the migration needs no
 * redirect for its most valuable pages, and the live Google Ads campaign
 * pointing at `/rakovyny`, `/vazony`, `/stolyky`, `/vulychni-mebli` and
 * `/paneli` keeps working untouched. `shopCategoryFromSlug` is the only place
 * the two vocabularies meet.
 *
 * A dynamic segment this high up matches everything, but Next resolves static
 * siblings (`/shop`, `/products`, `/contact`, …) first, so this only ever sees
 * what nothing else claimed. Anything that isn't one of the 7 slugs 404s via
 * `notFound()` — it does not fall through to the "all products" view, and it
 * does not render an empty grid under someone else's `h1`.
 */
export default async function ShopCategoryPage({
  params,
  searchParams,
}: {
  params: Promise<{ locale: string; category: string }>;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const { locale, category: slug } = await params;
  if (!isLocale(locale)) notFound();
  const category = shopCategoryFromSlug(slug);
  if (!category) notFound();
  const dictionary = await getDictionary(locale);
  const resolvedSearchParams = await searchParams;

  return (
    <ShopCatalog
      locale={locale}
      dictionary={dictionary}
      category={category}
      searchParams={resolvedSearchParams}
    />
  );
}
