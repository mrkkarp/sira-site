import type { Product } from "@/lib/schemas/product";
import type { ProductColour } from "@/lib/schemas/colour";
import type { Dictionary } from "@/i18n/get-dictionary";

/**
 * Pure (no `server-only`) catalog search — split out so both `/api/search`
 * (the header drawer's preview list) and the real `/search` results page can
 * share one matching implementation instead of two copies drifting apart.
 * Same "pure function over real snapshot data, unit-tested directly"
 * convention as `product-mapping.ts`/`shop-filters.ts` — no fetch, no
 * `server-only`, callers pass in whatever `getAllProducts()`/
 * `getAllProductColours()`/`getDictionary()` already gave them.
 */

export interface SearchPageResult {
  title: string;
  /** A locale-relative path (e.g. "/shop") — callers apply `localeHref` themselves, since this module has no `Locale` of its own. */
  href: string;
}

export interface CatalogSearchResult {
  /** Full matched `Product` records, ranked by first appearance in `products`, capped at `limit`. Callers decide how much of this to expose (the API route flattens it into `SearchProductResult`; the `/search` page renders it directly via `ProductGrid`). */
  products: Product[];
  pages: SearchPageResult[];
}

const DEFAULT_LIMIT = 6;

/** Every static, non-catalog destination the search box can surface — kept
 * here (not per-caller) so the API route and the `/search` page never drift
 * on which pages are searchable. No `collections`/`projects` entries: those
 * content types have no real backing data yet (see `src/domain/content/*`),
 * so — same discipline as everywhere else in this project — we don't
 * fabricate matches for them. */
const pageEntries: Array<{ key: keyof Dictionary["pages"]; href: string }> = [
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
  { key: "faq", href: "/faq" },
  { key: "contact", href: "/contact" },
];

export function searchCatalog(
  query: string,
  {
    products,
    colours,
    dictionary,
    limit = DEFAULT_LIMIT,
  }: {
    products: Product[];
    colours: ProductColour[];
    dictionary: Dictionary;
    limit?: number;
  },
): CatalogSearchResult {
  const normalized = query.trim().toLowerCase();
  if (!normalized) return { products: [], pages: [] };

  // A colour name matching the query broadens the product match (e.g.
  // typing "терракота" should surface products offered in that colour) —
  // our data doesn't tag products by colour slug individually, so this is
  // a best-effort match against the shared colour vocabulary, not a
  // per-product colour filter.
  const matchedColourNames = colours
    .filter((colour) => colour.displayName.toLowerCase().includes(normalized))
    .map((colour) => colour.displayName.toLowerCase());

  const matchedProducts = products
    .filter((product) => {
      const haystack =
        `${product.name} ${product.sku} ${product.sourceCategory}`.toLowerCase();
      return (
        haystack.includes(normalized) ||
        matchedColourNames.some((name) => haystack.includes(name))
      );
    })
    .slice(0, limit);

  const matchedPages: SearchPageResult[] = pageEntries
    .filter((entry) =>
      dictionary.pages[entry.key].toLowerCase().includes(normalized),
    )
    .slice(0, limit)
    .map((entry) => ({ title: dictionary.pages[entry.key], href: entry.href }));

  return { products: matchedProducts, pages: matchedPages };
}
