import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { isLocale } from "@/i18n/config";
import { getDictionary } from "@/i18n/get-dictionary";
import { localeHref } from "@/lib/locale-href";
import { SearchResults } from "@/components/search/search-results";
import { preloadProducts } from "@/lib/products";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>;
}): Promise<Metadata> {
  const { locale } = await params;
  if (!isLocale(locale)) return {};
  const dictionary = await getDictionary(locale);

  return {
    title: dictionary.search.title,
    alternates: { canonical: localeHref(locale, "/search") },
    // Search results are query-driven, per-visitor pages — never worth
    // indexing themselves (matches the header search drawer's own
    // "view all" destination, not a landing page).
    robots: { index: false, follow: true },
  };
}

/** `/search?q=...` — the real results page the header search drawer's
 * "view all results" link points to (see `search-drawer.tsx`). Renders the
 * same real, non-fabricated matches as `/api/search` (via the shared
 * `searchCatalog()` in `src/lib/search.ts`), server-rendered instead of
 * fetched client-side. */
export default async function SearchPage({
  params,
  searchParams,
}: {
  params: Promise<{ locale: string }>;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const { locale } = await params;
  if (!isLocale(locale)) notFound();
  const dictionary = await getDictionary(locale);
  const resolvedSearchParams = await searchParams;
  const rawQuery = resolvedSearchParams.q;
  const query = Array.isArray(rawQuery)
    ? (rawQuery[0] ?? "")
    : (rawQuery ?? "");

  await preloadProducts(locale);

  return (
    <SearchResults query={query} locale={locale} dictionary={dictionary} />
  );
}
