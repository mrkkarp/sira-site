import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { isLocale } from "@/i18n/config";
import { getDictionary } from "@/i18n/get-dictionary";
import { pageSeo } from "@/lib/seo/page-seo";
import { DesignersContent } from "@/components/designers/designers-content";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>;
}): Promise<Metadata> {
  const { locale } = await params;
  if (!isLocale(locale)) return {};
  const dictionary = await getDictionary(locale);

  // Real content as of block 2.3, so this route leaves `buildPlaceholderMetadata`
  // (which emits `noindex`) behind. `pageSeo` still advertises only the
  // indexable locales — the uk/en/pl copy here is hand-authored, but the rest
  // of the site's en/pl routes still fall back to Ukrainian, and hreflang is a
  // site-wide promise rather than a per-page one.
  return {
    title: dictionary.pages.designers,
    description: dictionary.designersPage.intro,
    ...pageSeo({
      locale,
      path: "/designers",
      title: `${dictionary.designersPage.heading} — ${dictionary.site.name}`,
      description: dictionary.designersPage.intro,
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
  return <DesignersContent dictionary={dictionary} />;
}
