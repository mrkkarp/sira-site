import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { getAllProducts } from "@/lib/products";
import { getAllProductColours } from "@/lib/product-colours";
import { isLocale, defaultLocale } from "@/i18n/config";
import { getDictionary } from "@/i18n/get-dictionary";
import { localeHref } from "@/lib/locale-href";

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
  const query = (searchParams.get("q") ?? "").trim().toLowerCase();
  const localeParam = searchParams.get("locale") ?? defaultLocale;
  const locale = isLocale(localeParam) ? localeParam : defaultLocale;

  if (!query) {
    return NextResponse.json({ products: [], collections: [], projects: [], pages: [] } satisfies SearchResponse);
  }

  const dictionary = await getDictionary(locale);
  const products = getAllProducts();
  const colours = getAllProductColours();

  // A colour name matching the query broadens the product match (e.g.
  // typing "терракота" should surface products offered in that colour) —
  // our data doesn't tag products by colour slug individually, so this is
  // a best-effort match against the shared colour vocabulary, not a
  // per-product colour filter.
  const matchedColourNames = colours
    .filter((colour) => colour.displayName.toLowerCase().includes(query))
    .map((colour) => colour.displayName.toLowerCase());

  const matchedProducts = products
    .filter((product) => {
      const haystack = `${product.name} ${product.sku} ${product.sourceCategory}`.toLowerCase();
      return haystack.includes(query) || matchedColourNames.some((name) => haystack.includes(name));
    })
    .slice(0, MAX_RESULTS_PER_GROUP)
    .map(
      (product): SearchProductResult => ({
        slug: product.slug,
        name: product.name,
        category: product.sourceCategory,
        price: product.base.price,
        photo: product.base.photo,
      }),
    );

  const pageEntries: Array<{ key: keyof typeof dictionary.pages; href: string }> = [
    { key: "shop", href: "/shop" },
    { key: "collections", href: "/collections" },
    { key: "colours", href: "/colours" },
    { key: "samples", href: "/samples" },
    { key: "projects", href: "/projects" },
    { key: "about", href: "/about" },
    { key: "paymentDelivery", href: "/payment-delivery" },
    { key: "returns", href: "/returns" },
    { key: "warranty", href: "/warranty" },
    { key: "care", href: "/care" },
    { key: "designers", href: "/designers" },
    { key: "resources", href: "/resources" },
    { key: "stockists", href: "/stockists" },
    { key: "faq", href: "/faq" },
    { key: "contact", href: "/contact" },
  ];

  const matchedPages = pageEntries
    .filter((entry) => dictionary.pages[entry.key].toLowerCase().includes(query))
    .slice(0, MAX_RESULTS_PER_GROUP)
    .map(
      (entry): SearchPageResult => ({
        title: dictionary.pages[entry.key],
        href: localeHref(locale, entry.href),
      }),
    );

  // No real collections/projects data exists yet (see src/lib/schemas/collection.ts
  // and project.ts) — these groups are structurally ready but always empty
  // until real content is added.
  return NextResponse.json({
    products: matchedProducts,
    collections: [],
    projects: [],
    pages: matchedPages,
  } satisfies SearchResponse);
}
