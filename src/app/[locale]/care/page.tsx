import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { isLocale } from "@/i18n/config";
import { getDictionary } from "@/i18n/get-dictionary";
import { indexableLocales } from "@/lib/seo/indexing";
import { localeHref } from "@/lib/locale-href";
import { getSiteUrl } from "@/lib/site-url";
import { getInfoPageContent } from "@/content/info-pages";
import { buildInfoPageDescription } from "@/lib/seo/info-page-description";
import { InfoPage } from "@/components/info-page/info-page";
import { PlaceholderPage } from "@/components/placeholder-page";
import { buildPlaceholderMetadata } from "@/lib/seo/placeholder-metadata";

const SLUG = "care";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>;
}): Promise<Metadata> {
  const { locale } = await params;
  if (!isLocale(locale)) return {};
  const dictionary = await getDictionary(locale);
  const content = getInfoPageContent(SLUG, locale);

  // Only locales with real transcribed content are indexable; the rest (en/pl,
  // which have no source prose) stay on the `noindex` placeholder metadata.
  if (!content) {
    return buildPlaceholderMetadata(locale, `/${SLUG}`, dictionary.pages.care);
  }

  const siteUrl = getSiteUrl();
  const canonicalPath = localeHref(locale, `/${SLUG}`);
  const description = buildInfoPageDescription(content);
  return {
    title: dictionary.pages.care,
    description,
    alternates: {
      canonical: canonicalPath,
      languages: Object.fromEntries(
        indexableLocales
          .filter((altLocale) => getInfoPageContent(SLUG, altLocale))
          .map((altLocale) => [altLocale, localeHref(altLocale, `/${SLUG}`)]),
      ),
    },
    openGraph: {
      title: `${dictionary.pages.care} — ${dictionary.site.name}`,
      description,
      url: new URL(canonicalPath, siteUrl).toString(),
      siteName: dictionary.site.name,
      locale,
      type: "website",
    },
  };
}

export default async function Page({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  if (!isLocale(locale)) notFound();
  const dictionary = await getDictionary(locale);
  const content = getInfoPageContent(SLUG, locale);
  if (!content) {
    return (
      <PlaceholderPage title={dictionary.pages.care} dictionary={dictionary} />
    );
  }
  return <InfoPage title={dictionary.pages.care} content={content} />;
}
