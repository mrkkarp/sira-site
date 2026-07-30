import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { getAllProducts } from "@/lib/products";
import { getAllProductColours } from "@/lib/product-colours";
import { isLocale, defaultLocale } from "@/i18n/config";
import { getDictionary } from "@/i18n/get-dictionary";
import { localeHref } from "@/lib/locale-href";
import { searchCatalog } from "@/lib/search";

export type SearchProductResult = {
  slug: string;
  name: string;
  category: string;
  price: number;
  photo: string;
};

export type SearchPageResult = {
  title: string;
  href: string;
};

export type SearchResponse = {
  products: SearchProductResult[];
  collections: SearchPageResult[];
  projects: SearchPageResult[];
  pages: SearchPageResult[];
};

const MAX_RESULTS_PER_GROUP = 6;

export async function GET(request: NextRequest) {
  const { searchParams } = request.nextUrl;
  const query = searchParams.get("q") ?? "";
  const localeParam = searchParams.get("locale") ?? defaultLocale;
  const locale = isLocale(localeParam) ? localeParam : defaultLocale;

  if (!query.trim()) {
    return NextResponse.json({
      products: [],
      collections: [],
      projects: [],
      pages: [],
    } satisfies SearchResponse);
  }

  const dictionary = await getDictionary(locale);
  const { products, pages } = searchCatalog(query, {
    products: getAllProducts(),
    colours: getAllProductColours(),
    dictionary,
    limit: MAX_RESULTS_PER_GROUP,
  });

  // No real collections/projects data exists yet (see src/lib/schemas/collection.ts
  // and project.ts) — these groups are structurally ready but always empty
  // until real content is added.
  return NextResponse.json({
    products: products.map((product): SearchProductResult => ({
      slug: product.slug,
      name: product.name,
      category: product.sourceCategory,
      price: product.base.price,
      photo: product.base.photo,
    })),
    collections: [],
    projects: [],
    pages: pages.map((page): SearchPageResult => ({
      title: page.title,
      href: localeHref(locale, page.href),
    })),
  } satisfies SearchResponse);
}
