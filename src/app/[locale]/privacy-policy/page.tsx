import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { isLocale } from "@/i18n/config";
import { getDictionary } from "@/i18n/get-dictionary";
import { indexableLocales } from "@/lib/seo/indexing";
import { pageSeo } from "@/lib/seo/page-seo";
import { getInfoPageContent } from "@/content/info-pages";
import { buildInfoPageDescription } from "@/lib/seo/info-page-description";
import { InfoPage } from "@/components/info-page/info-page";
import { PlaceholderPage } from "@/components/placeholder-page";
import { buildPlaceholderMetadata } from "@/lib/seo/placeholder-metadata";

const SLUG = "privacy-policy";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>;
}): Promise<Metadata> {
  const { locale } = await params;
  if (!isLocale(locale)) return {};
  const dictionary = await getDictionary(locale);
  const content = getInfoPageContent(SLUG, locale);

  // Only locales with real drafted prose are indexable; en/pl have none and
  // stay on the `noindex` placeholder, exactly as on the other info pages.
  if (!content) {
    return buildPlaceholderMetadata(
      locale,
      `/${SLUG}`,
      dictionary.pages.privacyPolicy,
    );
  }

  const description = buildInfoPageDescription(content);
  return {
    title: dictionary.pages.privacyPolicy,
    description,
    ...pageSeo({
      locale,
      path: `/${SLUG}`,
      title: `${dictionary.pages.privacyPolicy} — ${dictionary.site.name}`,
      description,
      siteName: dictionary.site.name,
      // Only locales that actually have content are advertised: pointing
      // hreflang at a `noindex` page is a contradiction Search Console reports.
      hreflangLocales: indexableLocales.filter((altLocale) =>
        getInfoPageContent(SLUG, altLocale),
      ),
    }),
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
      <PlaceholderPage
        title={dictionary.pages.privacyPolicy}
        dictionary={dictionary}
      />
    );
  }
  return (
    <InfoPage
      title={dictionary.pages.privacyPolicy}
      content={content}
      locale={locale}
    />
  );
}
