import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { isLocale } from "@/i18n/config";
import { getDictionary } from "@/i18n/get-dictionary";
import { pageSeo } from "@/lib/seo/page-seo";
import { ContactContent } from "@/components/contact/contact-content";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>;
}): Promise<Metadata> {
  const { locale } = await params;
  if (!isLocale(locale)) return {};
  const dictionary = await getDictionary(locale);

  // Unlike the other info routes (still `PlaceholderPage` + `noindex`), this
  // page now has real, owner-confirmed contact content, so it is indexable —
  // hence its own metadata here instead of `buildPlaceholderMetadata`.
  return {
    title: dictionary.pages.contact,
    description: dictionary.contactPage.intro,
    ...pageSeo({
      locale,
      path: "/contact",
      title: `${dictionary.pages.contact} — ${dictionary.site.name}`,
      description: dictionary.contactPage.intro,
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
  return <ContactContent dictionary={dictionary} />;
}
