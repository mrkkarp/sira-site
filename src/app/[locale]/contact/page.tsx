import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { isLocale, locales } from "@/i18n/config";
import { getDictionary } from "@/i18n/get-dictionary";
import { localeHref } from "@/lib/locale-href";
import { getSiteUrl } from "@/lib/site-url";
import { ContactContent } from "@/components/contact/contact-content";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>;
}): Promise<Metadata> {
  const { locale } = await params;
  if (!isLocale(locale)) return {};
  const dictionary = await getDictionary(locale);
  const siteUrl = getSiteUrl();
  const canonicalPath = localeHref(locale, "/contact");

  // Unlike the other info routes (still `PlaceholderPage` + `noindex`), this
  // page now has real, owner-confirmed contact content, so it is indexable —
  // hence its own metadata here instead of `buildPlaceholderMetadata`.
  return {
    title: dictionary.pages.contact,
    description: dictionary.contactPage.intro,
    alternates: {
      canonical: canonicalPath,
      languages: Object.fromEntries(
        locales.map((altLocale) => [
          altLocale,
          localeHref(altLocale, "/contact"),
        ]),
      ),
    },
    openGraph: {
      title: `${dictionary.pages.contact} — ${dictionary.site.name}`,
      description: dictionary.contactPage.intro,
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
  return <ContactContent dictionary={dictionary} />;
}
