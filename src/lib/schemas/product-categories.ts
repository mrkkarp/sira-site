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
 * Top-level shop categories — these map 1:1 to the `/shop/[category]` routes.
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
