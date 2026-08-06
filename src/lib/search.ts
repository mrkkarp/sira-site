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

/**
 * Ukrainian inflectional endings, longest first so `-ами` is tried before `-и`.
 *
 * This list is deliberately short and only covers *noun* endings, because
 * nouns are what a catalogue query is made of — "раковина", "вазон", "панель".
 * Adjectival and verbal endings are not here: nothing in the haystack is a
 * verb, and stripping `-ий`/`-ої` would start merging genuinely different
 * words.
 */
const UKRAINIAN_ENDINGS = [
  "ами",
  "ями",
  "ові",
  "еві",
  "ах",
  "ях",
  "ів",
  "їв",
  "ом",
  "ем",
  "ою",
  "ею",
  "а",
  "я",
  "о",
  "е",
  "у",
  "ю",
  "и",
  "і",
  "ї",
  "ь",
];

/** Shortest stem we will produce. Below this, endings stop being endings:
 *  "піч" would become "п", which matches most of the alphabet. */
const MIN_STEM = 4;

/**
 * Strips one inflectional ending, if doing so leaves a stem worth matching on.
 *
 * The reason this function exists at all: the catalogue stores category names
 * in the *plural nominative* ("Раковини", "Вазони", "Панелі", "Столики") while
 * people search in the *singular* ("раковина", "вазон", "панель", "столик").
 * The previous implementation compared the raw strings with `String.includes`,
 * which is a coincidence detector rather than a match: "вазон" is a substring
 * of "вазони" and worked, "раковина" is *not* a substring of "раковини" and
 * returned nothing — on a shop whose largest category is раковини. One letter
 * of grammatical agreement decided whether the search worked.
 *
 * Stemming both sides and comparing the stems removes the coincidence:
 * раковина → раковин ← раковини.
 */
function stem(token: string): string {
  for (const ending of UKRAINIAN_ENDINGS) {
    if (token.endsWith(ending) && token.length - ending.length >= MIN_STEM) {
      return token.slice(0, -ending.length);
    }
  }
  return token;
}

/** Splits on anything that isn't a letter or a digit, so "Раковини/Накладні",
 *  "1000×300×500" and "ODRI-1" all break into the words a person would type.
 *  Unicode-aware (`\p{L}`) — a `\w`-based split would treat every Cyrillic
 *  character as a separator and destroy the entire haystack. */
function tokenize(text: string): string[] {
  return text
    .toLowerCase()
    .split(/[^\p{L}\p{N}]+/u)
    .filter(Boolean);
}

/**
 * True when `queryToken` should be considered a match for `haystackToken`.
 *
 * Prefix rather than equality, in both directions, so that a partially typed
 * word still matches while the drawer is being typed into ("рако" → раковини)
 * and so a stem that survived stripping still meets one that did not.
 */
function tokensMatch(queryToken: string, haystackToken: string): boolean {
  const q = stem(queryToken);
  const h = stem(haystackToken);
  return h.startsWith(q) || q.startsWith(h);
}

/** Every query word must find a home somewhere in the haystack — AND, not OR.
 *  With OR, "раковина одрі" would return every раковина in the catalogue,
 *  which makes adding a word to a search *widen* it: the opposite of what
 *  typing more is for. */
function matchesQuery(queryTokens: string[], haystack: string): boolean {
  const haystackTokens = tokenize(haystack);
  return queryTokens.every((queryToken) =>
    haystackTokens.some((haystackToken) =>
      tokensMatch(queryToken, haystackToken),
    ),
  );
}

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
  const queryTokens = tokenize(normalized);
  if (queryTokens.length === 0) return { products: [], pages: [] };

  // A colour name matching the query broadens the product match (e.g.
  // typing "терракота" should surface products offered in that colour) —
  // our data doesn't tag products by colour slug individually, so this is
  // a best-effort match against the shared colour vocabulary, not a
  // per-product colour filter.
  const matchedColourNames = colours
    .filter((colour) => matchesQuery(queryTokens, colour.displayName))
    .map((colour) => colour.displayName);

  const matchedProducts = products
    .filter((product) => {
      const haystack = `${product.name} ${product.sku} ${product.sourceCategory}`;
      return (
        matchesQuery(queryTokens, haystack) ||
        matchedColourNames.some((name) =>
          matchesQuery(tokenize(name), haystack),
        )
      );
    })
    .slice(0, limit);

  const matchedPages: SearchPageResult[] = pageEntries
    .filter((entry) => matchesQuery(queryTokens, dictionary.pages[entry.key]))
    .slice(0, limit)
    .map((entry) => ({ title: dictionary.pages[entry.key], href: entry.href }));

  return { products: matchedProducts, pages: matchedPages };
}
