import type { ShopCategory } from "@/lib/schemas/product";
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
