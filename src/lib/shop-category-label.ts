import type { ShopCategory } from "@/lib/schemas/product";
import type { Dictionary } from "@/i18n/get-dictionary";

const keyMap = {
  sinks: "sinks",
  planters: "planters",
  tables: "tables",
  "wall-modules": "wallModules",
  "wall-panels": "wallPanels",
  "wall-art": "wallArt",
  outdoor: "outdoor",
} as const satisfies Record<ShopCategory, keyof Dictionary["shopCategories"]>;

export function shopCategoryLabel(category: ShopCategory, dictionary: Dictionary): string {
  return dictionary.shopCategories[keyMap[category]];
}
