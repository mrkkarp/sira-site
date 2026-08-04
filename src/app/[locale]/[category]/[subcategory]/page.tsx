import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { isLocale } from "@/i18n/config";
import { getDictionary } from "@/i18n/get-dictionary";
import { isIndexable } from "@/lib/seo/indexing";
import { pageSeo } from "@/lib/seo/page-seo";
import {
  findShopSubcategory,
  shopCategoryFromSlug,
  shopCategoryPath,
} from "@/lib/schemas/product";
import { getProductsBySubcategory, preloadProducts } from "@/lib/products";
import {
  shopSubcategoryLabel,
  shopSubcategoryIntro,
} from "@/lib/shop-category-label";
import { ShopCatalog } from "@/components/shop/shop-catalog";

/** Both the metadata and the page need the same two-step resolution, and
 * getting it wrong in one of them means a `<title>` that doesn't match the
 * `h1`. Resolve once, here. */
function resolve(slug: string, subSlug: string) {
  const category = shopCategoryFromSlug(slug);
  if (!category) return undefined;
  return findShopSubcategory(category, subSlug);
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string; category: string; subcategory: string }>;
}): Promise<Metadata> {
  const {
    locale,
    category: slug,
    subcategory: subSlug,
  } = await params;
  if (!isLocale(locale)) return {};
  const subcategory = resolve(slug, subSlug);
  if (!subcategory) return {};
  const dictionary = await getDictionary(locale);
  const title = shopSubcategoryLabel(subcategory, dictionary);
  const description = shopSubcategoryIntro(subcategory, dictionary);

  // Same soft-404 guard as the parent category: a subcategory whose facet
  // matches nothing is a 200 with an empty grid, which is exactly the thing
  // Google penalises. All three have products today; this keeps that true
  // automatically rather than by remembering to check.
  await preloadProducts(locale);
  const products = getProductsBySubcategory(subcategory);
  const isEmpty = products.length === 0;

  return {
    title,
    description,
    ...(isEmpty
      ? { robots: { index: false, follow: isIndexable(locale) } }
      : {}),
    ...pageSeo({
      locale,
      path: shopCategoryPath(subcategory.category, subcategory.slug),
      title,
      description,
      siteName: dictionary.site.name,
      image: products[0]?.base.photo,
    }),
  };
}

/**
 * `/<category>/<subcategory>` — the three facet splits that earn their own
 * URL: `/rakovyny/pidlohovi`, `/rakovyny/nakladni`, `/vazony/vulychni`. Which
 * three, and why only three, is documented on `shopSubcategories` in
 * `src/lib/schemas/product-categories.ts`.
 *
 * Each is the crawlable twin of a filter the visitor could also apply by hand
 * (`?mount=countertop`), and each was a real URL on the old site, so this
 * route is simultaneously the SEO structure and half the migration map.
 *
 * A subcategory slug under the wrong parent (`/vazony/nakladni`) 404s rather
 * than falling back to the parent listing: it is not a page that ever existed,
 * and answering 200 to invented URLs is how a catalogue grows infinite
 * duplicate paths.
 */
export default async function ShopSubcategoryPage({
  params,
  searchParams,
}: {
  params: Promise<{ locale: string; category: string; subcategory: string }>;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const {
    locale,
    category: slug,
    subcategory: subSlug,
  } = await params;
  if (!isLocale(locale)) notFound();
  const subcategory = resolve(slug, subSlug);
  if (!subcategory) notFound();
  const dictionary = await getDictionary(locale);
  const resolvedSearchParams = await searchParams;

  return (
    <ShopCatalog
      locale={locale}
      dictionary={dictionary}
      category={subcategory.category}
      subcategory={subcategory}
      searchParams={resolvedSearchParams}
    />
  );
}
