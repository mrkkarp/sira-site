import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { isLocale } from "@/i18n/config";
import { getDictionary } from "@/i18n/get-dictionary";
import { indexableLocales } from "@/lib/seo/indexing";
import { localeHref } from "@/lib/locale-href";
import { getSiteUrl } from "@/lib/site-url";
import { ShopCatalog } from "@/components/shop/shop-catalog";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>;
}): Promise<Metadata> {
  const { locale } = await params;
  if (!isLocale(locale)) return {};
  const dictionary = await getDictionary(locale);
  const siteUrl = getSiteUrl();
  const canonicalPath = localeHref(locale, "/shop");

  return {
    title: dictionary.shop.heading,
    description: dictionary.shop.allCategoriesIntro,
    alternates: {
      canonical: canonicalPath,
      languages: Object.fromEntries(
        indexableLocales.map((altLocale) => [
          altLocale,
          localeHref(altLocale, "/shop"),
        ]),
      ),
    },
    openGraph: {
      title: dictionary.shop.heading,
      description: dictionary.shop.allCategoriesIntro,
      url: new URL(canonicalPath, siteUrl).toString(),
      siteName: dictionary.site.name,
      locale,
      type: "website",
    },
  };
}

/** `/shop` — all products, no category filter. See Prompt 5: the actual
 * filtering/sorting/pagination/grid all live in the shared `ShopCatalog`
 * (also used by `/shop/[category]`) so there is one reusable architecture. */
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
