import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { isLocale } from "@/i18n/config";
import { getDictionary } from "@/i18n/get-dictionary";
import { pageSeo } from "@/lib/seo/page-seo";
import { ShopCatalog } from "@/components/shop/shop-catalog";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>;
}): Promise<Metadata> {
  const { locale } = await params;
  if (!isLocale(locale)) return {};
  const dictionary = await getDictionary(locale);

  return {
    title: dictionary.shop.heading,
    description: dictionary.shop.allCategoriesIntro,
    ...pageSeo({
      locale,
      path: "/shop",
      title: dictionary.shop.heading,
      description: dictionary.shop.allCategoriesIntro,
      siteName: dictionary.site.name,
    }),
  };
}

/** `/shop` — all products, no category filter. See Prompt 5: the actual
 * filtering/sorting/pagination/grid all live in the shared `ShopCatalog`
 * (also used by `/[category]` and `/[category]/[subcategory]`) so there is
 * one reusable architecture. */
export default async function ShopPage({
  params,
  searchParams,
}: {
  params: Promise<{ locale: string }>;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const { locale } = await params;
  if (!isLocale(locale)) notFound();
  const dictionary = await getDictionary(locale);
  const resolvedSearchParams = await searchParams;

  return (
    <ShopCatalog
      locale={locale}
      dictionary={dictionary}
      searchParams={resolvedSearchParams}
    />
  );
}
