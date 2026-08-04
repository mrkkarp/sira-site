import type { ShopCategory, ShopSubcategory } from "@/lib/schemas/product";
import type { Dictionary } from "@/i18n/get-dictionary";

// Exported (not just module-private) so the Horoshop importer (Phase G,
// `src/services/horoshop-import-service.ts`) can look up the same real
// dictionary label when creating a canonical `Categories` document,
// without duplicating this 7-entry literal a third time.
export const shopCategoryDictionaryKeyMap = {
  sinks: "sinks",
  planters: "planters",
  tables: "tables",
  "wall-modules": "wallModules",
  "wall-panels": "wallPanels",
  "wall-art": "wallArt",
  outdoor: "outdoor",
} as const satisfies Record<ShopCategory, keyof Dictionary["shopCategories"]>;

export function shopCategoryLabel(
  category: ShopCategory,
  dictionary: Dictionary,
): string {
  return dictionary.shopCategories[shopCategoryDictionaryKeyMap[category]];
}

const introKeyMap = {
  sinks: "sinks",
  planters: "planters",
  tables: "tables",
  "wall-modules": "wallModules",
  "wall-panels": "wallPanels",
  "wall-art": "wallArt",
  outdoor: "outdoor",
} as const satisfies Record<
  ShopCategory,
  keyof Dictionary["shop"]["categoryIntros"]
>;

export function shopCategoryIntro(
  category: ShopCategory,
  dictionary: Dictionary,
): string {
  return dictionary.shop.categoryIntros[introKeyMap[category]];
}

/**
 * Subcategories carry their own heading and intro rather than composing one
 * from the parent's ("Умивальники — Накладні"): the whole reason these three
 * URLs exist is that each answers a distinct commercial query, and a stitched
 * label is nobody's search term. `dictionaryKey` lives on the subcategory
 * record itself (`src/lib/schemas/product-categories.ts`) so adding a fourth
 * route is one entry in one list, not an entry plus two lookup maps here.
 */
export function shopSubcategoryLabel(
  subcategory: ShopSubcategory,
  dictionary: Dictionary,
): string {
  return dictionary.shop.subcategories[subcategory.dictionaryKey].heading;
}

export function shopSubcategoryIntro(
  subcategory: ShopSubcategory,
  dictionary: Dictionary,
): string {
  return dictionary.shop.subcategories[subcategory.dictionaryKey].intro;
}
