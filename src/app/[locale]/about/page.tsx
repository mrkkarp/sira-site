import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { isLocale } from "@/i18n/config";
import { getDictionary } from "@/i18n/get-dictionary";
import { pageSeo } from "@/lib/seo/page-seo";
import { AboutContent } from "@/components/about/about-content";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>;
}): Promise<Metadata> {
  const { locale } = await params;
  if (!isLocale(locale)) return {};
  const dictionary = await getDictionary(locale);
  const copy = dictionary.aboutPage;

  // Real content as of this change, so the route leaves `buildPlaceholderMetadata`
  // (which emits `noindex`) behind — same move `/designers` made. The
  // description is its own key rather than a slice of `intro`: a lead
  // paragraph that reads well on the page runs past what Google will show,
  // and a truncated first sentence is a worse snippet than a written one.
  return {
    title: dictionary.pages.about,
    description: copy.seoDescription,
    ...pageSeo({
      locale,
      path: "/about",
      title: `${copy.heading} — ${dictionary.site.name}`,
      description: copy.seoDescription,
      siteName: dictionary.site.name,
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
  return <AboutContent locale={locale} dictionary={dictionary} />;
}
