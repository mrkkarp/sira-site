import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { isLocale, locales } from "@/i18n/config";
import { getDictionary } from "@/i18n/get-dictionary";
import { localeHref } from "@/lib/locale-href";
import { getSiteUrl } from "@/lib/site-url";
import { ShopCategorySchema } from "@/lib/schemas/product";
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
  const { locale, category: rawCategory } = await params;
  if (!isLocale(locale)) return {};
  const parsedCategory = ShopCategorySchema.safeParse(rawCategory);
  if (!parsedCategory.success) return {};
  const category = parsedCategory.data;
  const dictionary = await getDictionary(locale);
  const siteUrl = getSiteUrl();
  const canonicalPath = localeHref(locale, `/shop/${category}`);

  const title = shopCategoryLabel(category, dictionary);
  const description = shopCategoryIntro(category, dictionary);

  return {
    title,
    description,
    alternates: {
      canonical: canonicalPath,
      languages: Object.fromEntries(
        locales.map((altLocale) => [
          altLocale,
          localeHref(altLocale, `/shop/${category}`),
        ]),
      ),
    },
    openGraph: {
      title,
      description,
      url: new URL(canonicalPath, siteUrl).toString(),
      siteName: dictionary.site.name,
      locale,
      type: "website",
    },
  };
}

/**
 * `/shop/[category]` — one dynamic route for all 7 real `ShopCategory`
 * values (Prompt 5's "one reusable collection architecture" requirement),
 * replacing what used to be 7 separate static stub folders. Unknown/invalid
 * category segments 404 via `notFound()` rather than silently falling
 * through to the "all products" view.
 */
export default async function ShopCategoryPage({
  params,
  searchParams,
}: {
  params: Promise<{ locale: string; category: string }>;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const { locale, category: rawCategory } = await params;
  if (!isLocale(locale)) notFound();
  const parsedCategory = ShopCategorySchema.safeParse(rawCategory);
  if (!parsedCategory.success) notFound();
  const dictionary = await getDictionary(locale);
  const resolvedSearchParams = await searchParams;

  return (
    <ShopCatalog
      locale={locale}
      dictionary={dictionary}
      category={parsedCategory.data}
      searchParams={resolvedSearchParams}
    />
  );
}
