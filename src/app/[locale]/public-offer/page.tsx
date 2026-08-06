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

const SLUG = "public-offer";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>;
}): Promise<Metadata> {
  const { locale } = await params;
  if (!isLocale(locale)) return {};
  const dictionary = await getDictionary(locale);
  const content = getInfoPageContent(SLUG, locale);

  // Unlike its three siblings this page has no content in ANY locale yet: the
  // offer text is written, but `legalEntity` in `src/config/legal.ts` is still
  // `null`, and an offer that names no seller must not be published. Fill that
  // in and this route turns real on its own — see the note in that file.
  if (!content) {
    return buildPlaceholderMetadata(
      locale,
      `/${SLUG}`,
      dictionary.pages.publicOffer,
    );
  }

  const description = buildInfoPageDescription(content);
  return {
    title: dictionary.pages.publicOffer,
    description,
    ...pageSeo({
      locale,
      path: `/${SLUG}`,
      title: `${dictionary.pages.publicOffer} — ${dictionary.site.name}`,
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
        title={dictionary.pages.publicOffer}
        dictionary={dictionary}
      />
    );
  }
  return (
    <InfoPage
      title={dictionary.pages.publicOffer}
      content={content}
      locale={locale}
    />
  );
}
