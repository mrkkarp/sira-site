/**
 * The catalogue's closed vocabularies, as plain tuples — deliberately in a
 * module that imports nothing.
 *
 * These four lists are just strings, but they used to live in
 * `./product.ts`, whose first line is `import { z } from "zod"`. That is a
 * detail with a price attached: `search-drawer.tsx` renders the category chips
 * from `shopCategories`, the search drawer is part of the header, and the
 * header is on every page — so importing seven strings pulled zod's whole
 * runtime into the shared client bundle. It was ~277 kB uncompressed, on the
 * homepage and the contact page, neither of which validates anything.
 *
 * Nothing is tree-shaken away, because nothing about the import looks unused:
 * the bundler sees a module with a side-effecting top-level import and keeps
 * it. Splitting the data out is the fix, and `product.ts` re-exports all four
 * names so every existing server-side import keeps working unchanged.
 *
 * The rule this encodes: a module a client component imports a *value* from
 * carries its entire dependency graph to the browser. Keep the vocabularies
 * free of dependencies and the schemas can stay wherever they like.
 */

/**
 * Top-level shop categories — the internal, English, stable identifiers.
 * These are what the data layer, the filters and the Payload import all speak;
 * the *URLs* they render at live in `shopCategorySlugs` below and are
 * deliberately different.
 */
export const shopCategories = [
  "sinks",
  "planters",
  "tables",
  "wall-modules",
  "wall-panels",
  "wall-art",
  "outdoor",
] as const;

/** Sink mounting type — only meaningful when category is "sinks". */
export const sinkTypes = ["freestanding", "countertop", "wall-mounted"] as const;

/** Outdoor product type — only meaningful when category is "outdoor". Not
 * currently derivable from the source export (see `mapCategory` in
 * `src/lib/product-mapping.ts`) — kept for forward compatibility only. */
export const outdoorTypes = ["bench", "bin", "tree-grate", "bollard"] as const;

/** Planter placement — only meaningful when category is "planters". Real,
 * derived from the source category split ("Вазони/До дому" vs "Вазони/Вуличні"). */
export const planterPlacements = ["indoor", "outdoor"] as const;

/* -------------------------------------------------------------------------
 * URLs
 * ---------------------------------------------------------------------- */

// Derived locally rather than imported from `./product`, so this module keeps
// its promise of importing nothing. `ShopCategory` there is `z.infer` of
// `z.enum(shopCategories)`, which is this exact union.
type Category = (typeof shopCategories)[number];

/**
 * Category identifier → the URL segment it is served at.
 *
 * These are the *old odudlab.com Horoshop slugs*, kept letter-for-letter on
 * purpose. They are the site's only URLs with any search history behind them,
 * and one of them (`/paneli`, `/rakovyny`, `/vazony`, `/stolyky`,
 * `/vulychni-mebli`) is a live Google Ads landing page. Serving the category
 * at its historical address means the migration costs zero redirect hops and
 * the running campaign keeps working without being edited.
 *
 * So: identifiers stay English because code reads better that way, URLs stay
 * Ukrainian because that is what is already indexed. The two are joined here
 * and nowhere else — never hand-write a category path.
 *
 * The slugs are the same in every locale (`/rakovyny`, `/en/rakovyny`,
 * `/pl/rakovyny`). Translating them would fork the URL space three ways for
 * no gain: `en`/`pl` are `noindex` today, and a translated slug would need its
 * own redirect map the day they aren't.
 */
export const shopCategorySlugs = {
  sinks: "rakovyny",
  planters: "vazony",
  tables: "stolyky",
  outdoor: "vulychni-mebli",
  "wall-panels": "paneli",
  "wall-art": "panno-na-stinu",
  "wall-modules": "betonni-moduli-dlia-stiny",
} as const satisfies Record<Category, string>;

export type ShopCategorySlug = (typeof shopCategorySlugs)[Category];

/** Reverse lookup for the `[category]` route segment. Computed rather than
 * written out a second time — a hand-maintained mirror is a drift waiting to
 * happen, and seven linear comparisons per request are free. */
export function shopCategoryFromSlug(slug: string): Category | undefined {
  return shopCategories.find(
    (category) => shopCategorySlugs[category] === slug,
  );
}

/**
 * The only three subcategory routes that exist, each one a real facet split
 * with a real product count behind it and a real old-site URL in front of it:
 *
 * | route                  | facet                     | products |
 * | ---------------------- | ------------------------- | -------- |
 * | `/rakovyny/pidlohovi`  | sinkType = freestanding   | 16       |
 * | `/rakovyny/nakladni`   | sinkType = countertop     | 16       |
 * | `/vazony/vulychni`     | placement = outdoor       | 6        |
 *
 * Notably absent: `/stolyky/zhurnalni`. Every table in the catalogue is a
 * coffee table, so that page would list exactly what `/stolyky` lists — two
 * URLs competing for one intent. `/zhurnalni` redirects to the parent
 * instead. `/vazony/do-domu` is absent for the opposite reason: it would be a
 * real split (14 products), but no query on the target keyword list wants it,
 * so it stays a filter (`?placement=indoor`) rather than becoming a page.
 *
 * `facet` is the `FilterState` key *and* the query-string parameter name, so
 * `/rakovyny/nakladni` and `/rakovyny?mount=countertop` return the same set —
 * the subcategory is the indexable, linkable form of a filter that visitors
 * can also reach by clicking.
 */
export const shopSubcategories = [
  {
    slug: "pidlohovi",
    category: "sinks",
    facet: "mount",
    value: "freestanding",
    dictionaryKey: "sinksFreestanding",
  },
  {
    slug: "nakladni",
    category: "sinks",
    facet: "mount",
    value: "countertop",
    dictionaryKey: "sinksCountertop",
  },
  {
    slug: "vulychni",
    category: "planters",
    facet: "placement",
    value: "outdoor",
    dictionaryKey: "plantersOutdoor",
  },
] as const satisfies readonly {
  slug: string;
  category: Category;
  facet: "mount" | "placement";
  value: string;
  dictionaryKey: string;
}[];

export type ShopSubcategory = (typeof shopSubcategories)[number];

/** The subcategory served at `/<categorySlug>/<slug>`, or `undefined` — which
 * the route turns into a 404 rather than silently rendering the parent. */
export function findShopSubcategory(
  category: Category,
  slug: string,
): ShopSubcategory | undefined {
  return shopSubcategories.find(
    (sub) => sub.category === category && sub.slug === slug,
  );
}

/** Every path a category renders at, in link order — the parent first, then
 * its subcategories. Used by the sitemap and the category nav. */
export function shopSubcategoriesOf(
  category: Category,
): readonly ShopSubcategory[] {
  return shopSubcategories.filter((sub) => sub.category === category);
}

/**
 * The locale-less path for a category page. `localeHref()` still has to wrap
 * the result for anything user-facing — this only decides the `/rakovyny`
 * part, not the `/en` in front of it.
 */
export function shopCategoryPath(
  category: Category,
  subcategorySlug?: string,
): string {
  const base = `/${shopCategorySlugs[category]}`;
  return subcategorySlug ? `${base}/${subcategorySlug}` : base;
}
