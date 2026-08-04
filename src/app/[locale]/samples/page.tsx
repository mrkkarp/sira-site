import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { isLocale } from "@/i18n/config";
import { getDictionary } from "@/i18n/get-dictionary";
import { pageSeo } from "@/lib/seo/page-seo";
import { SamplesContent } from "@/components/samples/samples-content";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>;
}): Promise<Metadata> {
  const { locale } = await params;
  if (!isLocale(locale)) return {};
  const dictionary = await getDictionary(locale);

  // Indexable from block 2.3 onward — see `/designers/page.tsx` for the same
  // note about leaving `buildPlaceholderMetadata` behind.
  return {
    title: dictionary.pages.samples,
    description: dictionary.samplesPage.intro,
    ...pageSeo({
      locale,
      path: "/samples",
      title: `${dictionary.samplesPage.heading} — ${dictionary.site.name}`,
      description: dictionary.samplesPage.intro,
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
  return <SamplesContent dictionary={dictionary} />;
}
