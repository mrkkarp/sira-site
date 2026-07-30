import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { isLocale } from "@/i18n/config";
import { getDictionary } from "@/i18n/get-dictionary";
import { PlaceholderPage } from "@/components/placeholder-page";
import { buildPlaceholderMetadata } from "@/lib/seo/placeholder-metadata";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string; slug: string }>;
}): Promise<Metadata> {
  const { locale, slug } = await params;
  if (!isLocale(locale)) return {};
  const dictionary = await getDictionary(locale);
  return buildPlaceholderMetadata(
    locale,
    `/projects/${slug}`,
    dictionary.pages.projects,
  );
}

export default async function Page({
  params,
}: {
  params: Promise<{ locale: string; slug: string }>;
}) {
  const { locale } = await params;
  if (!isLocale(locale)) notFound();
  const dictionary = await getDictionary(locale);
  // No real per-project content/slugs exist yet (this route is architecturally
  // wired up, not populated — see CONTENT_CHECKLIST.md), so it shows the same
  // generic placeholder title as `/projects` rather than a hardcoded,
  // untranslated "Project: {slug}" string.
  return (
    <PlaceholderPage
      title={dictionary.pages.projects}
      dictionary={dictionary}
    />
  );
}
