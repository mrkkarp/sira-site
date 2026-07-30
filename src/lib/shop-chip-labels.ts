import type { Dictionary } from "@/i18n/get-dictionary";
import type { ActiveFilterChip } from "@/lib/shop-filters";

const mountKeyMap: Record<string, keyof Dictionary["shop"]["filters"]> = {
  freestanding: "mountFreestanding",
  countertop: "mountCountertop",
  "wall-mounted": "mountWallMounted",
};

const placementKeyMap: Record<string, keyof Dictionary["shop"]["filters"]> = {
  indoor: "placementIndoor",
  outdoor: "placementOutdoor",
};

const colourKeyMap: Record<string, keyof Dictionary["shop"]["filters"]> = {
  base: "colourBase",
  custom: "colourCustom",
};

/** Human-readable label for a single active-filter chip. */
export function chipLabel(
  chip: ActiveFilterChip,
  dictionary: Dictionary,
  collectionNames: Record<string, string>,
  unit: { price: string; width: string; height: string },
): string {
  const filters = dictionary.shop.filters;
  switch (chip.key) {
    case "mount":
      return filters[mountKeyMap[chip.value]] ?? chip.value;
    case "placement":
      return filters[placementKeyMap[chip.value]] ?? chip.value;
    case "colour":
      return filters[colourKeyMap[chip.value]] ?? chip.value;
    case "collection":
      return collectionNames[chip.value] ?? chip.value;
    case "price":
      return formatRangeChip(chip.value, unit.price);
    case "width":
      return formatRangeChip(chip.value, unit.width);
    case "height":
      return formatRangeChip(chip.value, unit.height);
  }
}

function formatRangeChip(value: string, unit: string): string {
  const [minRaw, maxRaw] = value.split("-");
  const min = minRaw === "" ? undefined : minRaw;
  const max = maxRaw === "" ? undefined : maxRaw;
  if (min !== undefined && max !== undefined) return `${min}–${max} ${unit}`;
  if (min !== undefined) return `≥ ${min} ${unit}`;
  if (max !== undefined) return `≤ ${max} ${unit}`;
  return unit;
}
