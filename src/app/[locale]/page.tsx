import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { isLocale, locales } from "@/i18n/config";
import { getDictionary } from "@/i18n/get-dictionary";
import { localeHref } from "@/lib/locale-href";
import { getSiteUrl } from "@/lib/site-url";
import {
  getAllProducts,
  getProductBySlug,
  preloadProducts,
} from "@/lib/products";
import { getAllProductColours } from "@/lib/product-colours";
import {
  popularProductSlugs,
  paletteColourSlugs,
  quickCategories,
} from "@/config/homepage";
import {
  HeroCarousel,
  QuickCategories,
  EditorialCampaigns,
  PopularProducts,
  ColourPalette,
  SamplesBlock,
  AboutBrand,
  Advantages,
  ProjectsShowcase,
  DesignersCta,
  Testimonials,
  PressPartners,
  VisualDiary,
} from "@/components/home";
import { HomeStructuredData } from "@/components/home/structured-data";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>;
}): Promise<Metadata> {
  const { locale } = await params;
  if (!isLocale(locale)) return {};
  const dictionary = await getDictionary(locale);
  const siteUrl = getSiteUrl();
  const canonicalPath = localeHref(locale, "/");

  return {
    title: dictionary.home.seo.title,
    description: dictionary.home.seo.description,
    alternates: {
      canonical: canonicalPath,
      languages: Object.fromEntries(
        locales.map((altLocale) => [altLocale, localeHref(altLocale, "/")]),
      ),
    },
    openGraph: {
      title: dictionary.home.seo.title,
      description: dictionary.home.seo.description,
      url: new URL(canonicalPath, siteUrl).toString(),
      siteName: dictionary.site.name,
      locale,
      type: "website",
    },
  };
}

/**
 * ODUDLAB homepage — see Prompt 4 for the full editorial spec this
 * composes. Section order matches the spec's numbering (§1–§13); each
 * section is its own component under `src/components/home/`, reading
 * structure from `src/config/homepage.ts` and copy from
 * `dictionary.home.*`. Real product/colour data comes straight from the
 * existing catalog (`src/lib/products.ts`, `src/lib/product-colours.ts`) —
 * nothing here is invented.
 */
export default async function HomePage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  if (!isLocale(locale)) notFound();
  const dictionary = await getDictionary(locale);

  await preloadProducts(locale);
  const allProducts = getAllProducts();
  const popularProducts = popularProductSlugs
    .map((slug) => allProducts.find((product) => product.slug === slug))
    .filter((product) => product !== undefined);

  const allColours = getAllProductColours();
  const paletteColours = paletteColourSlugs
    .map((slug) => allColours.find((colour) => colour.slug === slug))
    .filter((colour) => colour !== undefined);

  // Resolve each quick-category's representative photo from the real catalog
  // (keyed by href). Using the live product's `base.photo` — rather than a
  // hardcoded path — keeps the homepage image in lockstep with the actual
  // product media; a slug that stops resolving simply drops back to the
  // "Фото очікується" placeholder in <QuickCategories>.
  const categoryImages: Record<string, string> = {};
  for (const category of quickCategories) {
    if (category.kind !== "shop-category") continue;
    const photo = getProductBySlug(category.representativeSlug)?.base.photo;
    if (photo) categoryImages[category.href] = photo;
  }

  return (
    <>
      <HomeStructuredData locale={locale} dictionary={dictionary} />
      <HeroCarousel locale={locale} dictionary={dictionary} />
      <QuickCategories
        locale={locale}
        dictionary={dictionary}
        categoryImages={categoryImages}
      />
      <EditorialCampaigns locale={locale} dictionary={dictionary} />
      <PopularProducts
        products={popularProducts}
        locale={locale}
        dictionary={dictionary}
      />
      <ColourPalette
        colours={paletteColours}
        locale={locale}
        dictionary={dictionary}
      />
      <SamplesBlock locale={locale} dictionary={dictionary} />
      <AboutBrand locale={locale} dictionary={dictionary} />
      <Advantages dictionary={dictionary} />
      <ProjectsShowcase locale={locale} dictionary={dictionary} />
      <DesignersCta locale={locale} dictionary={dictionary} />
      <Testimonials dictionary={dictionary} />
      <PressPartners />
      <VisualDiary dictionary={dictionary} />
    </>
  );
}
