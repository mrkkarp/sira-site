import type {
  Product,
  SinkType,
  PlanterPlacement,
} from "@/lib/schemas/product";
// Values, not types, so this import decides what ships to the browser: the
// filter sidebar and the mobile filter drawer are client components, and
// reaching these two tuples through `./product` (which imports zod) put zod's
// entire runtime into `/shop`'s bundle. Types above are erased and cost
// nothing, so they can keep coming from the schema module.
import { sinkTypes, planterPlacements } from "@/lib/schemas/product-categories";

/**
 * URL-state filter engine for `/shop` and `/shop/[category]`. Pure functions
 * only (no DOM/router access) so the parsing/filtering/sorting/serialising
 * logic is fully unit-testable — see `shop-filters.test.ts`.
 *
 * Deliberately scoped to what the real product data (`src/lib/products.ts`)
 * actually contains: mount type and dimensions for sinks, indoor/outdoor for
 * planters, a binary base/custom colour flag, price, and an optional demo
 * collection membership. Spec'd facets with no backing real data (shape, tap
 * hole, overflow, basin count, material, availability, new/bestseller,
 * texture/thickness/purpose) are intentionally not modelled here — see the
 * Prompt 5 final report's "known limitations" section.
 */

export const colourFilterValues = ["base", "custom"] as const;
export type ColourFilterValue = (typeof colourFilterValues)[number];

export const sortOptions = [
  "featured",
  "price-asc",
  "price-desc",
  "name-asc",
] as const;
export type SortOption = (typeof sortOptions)[number];
export const defaultSort: SortOption = "featured";

export type NumericRange = { min?: number; max?: number };

export type FilterState = {
  mount: SinkType[];
  placement: PlanterPlacement[];
  colour: ColourFilterValue[];
  collection: string[];
  price?: NumericRange;
  width?: NumericRange;
  height?: NumericRange;
  sort: SortOption;
  page: number;
};

/** Canonical, stable param order — every serialisation call emits params in
 * this exact order, regardless of insertion order in the `FilterState`. */
export const filterParamOrder = [
  "mount",
  "placement",
  "colour",
  "collection",
  "price",
  "width",
  "height",
  "sort",
  "page",
] as const;

export function emptyFilterState(): FilterState {
  return {
    mount: [],
    placement: [],
    colour: [],
    collection: [],
    price: undefined,
    width: undefined,
    height: undefined,
    sort: defaultSort,
    page: 1,
  };
}

function readParam(
  searchParams: Record<string, string | string[] | undefined>,
  key: string,
): string | undefined {
  const value = searchParams[key];
  if (Array.isArray(value)) return value[0];
  return value;
}

function parseMultiEnum<T extends string>(
  raw: string | undefined,
  validValues: readonly T[],
): T[] {
  if (!raw) return [];
  const seen = new Set<T>();
  const result: T[] = [];
  for (const candidate of raw.split(",")) {
    const trimmed = candidate.trim();
    if (
      (validValues as readonly string[]).includes(trimmed) &&
      !seen.has(trimmed as T)
    ) {
      seen.add(trimmed as T);
      result.push(trimmed as T);
    }
    // Anything not in `validValues` is silently dropped — an invalid value
    // must never crash parsing or produce a phantom filter.
  }
  return result;
}

function parseRange(raw: string | undefined): NumericRange | undefined {
  if (!raw) return undefined;
  const dashIndex = raw.indexOf("-");
  if (dashIndex === -1) {
    const single = Number.parseFloat(raw);
    return Number.isFinite(single) && single >= 0
      ? { min: single, max: single }
      : undefined;
  }
  const minRaw = raw.slice(0, dashIndex);
  const maxRaw = raw.slice(dashIndex + 1);
  const min = minRaw === "" ? undefined : Number.parseFloat(minRaw);
  const max = maxRaw === "" ? undefined : Number.parseFloat(maxRaw);
  const minValid = min === undefined || (Number.isFinite(min) && min >= 0);
  const maxValid = max === undefined || (Number.isFinite(max) && max >= 0);
  if (!minValid || !maxValid) return undefined;
  if (min !== undefined && max !== undefined && min > max) return undefined;
  if (min === undefined && max === undefined) return undefined;
  return { min, max };
}

function parseSort(raw: string | undefined): SortOption {
  if (raw && (sortOptions as readonly string[]).includes(raw))
    return raw as SortOption;
  return defaultSort;
}

function parsePage(raw: string | undefined): number {
  const parsed = Number.parseInt(raw ?? "", 10);
  if (!Number.isFinite(parsed) || parsed < 1) return 1;
  return parsed;
}

/**
 * Parses a plain search-param record (works directly with Next.js's
 * `searchParams` prop, and with `Object.fromEntries(new URLSearchParams())`
 * for tests) into a typed, validated `FilterState`. Never throws — any
 * malformed/unknown value is dropped rather than surfaced as an error.
 */
export function parseFilters(
  searchParams: Record<string, string | string[] | undefined>,
): FilterState {
  return {
    mount: parseMultiEnum(readParam(searchParams, "mount"), sinkTypes),
    placement: parseMultiEnum(
      readParam(searchParams, "placement"),
      planterPlacements,
    ),
    colour: parseMultiEnum(
      readParam(searchParams, "colour"),
      colourFilterValues,
    ),
    // Collection slugs aren't a fixed enum here (they're validated against
    // real collection data separately, via `intersectValidCollections`);
    // accept any slug-shaped token at parse time.
    collection: parseFreeformList(readParam(searchParams, "collection")),
    price: parseRange(readParam(searchParams, "price")),
    width: parseRange(readParam(searchParams, "width")),
    height: parseRange(readParam(searchParams, "height")),
    sort: parseSort(readParam(searchParams, "sort")),
    page: parsePage(readParam(searchParams, "page")),
  };
}

function parseFreeformList(raw: string | undefined): string[] {
  if (!raw) return [];
  const seen = new Set<string>();
  const result: string[] = [];
  for (const candidate of raw.split(",")) {
    const trimmed = candidate.trim();
    if (trimmed && /^[a-z0-9-]+$/i.test(trimmed) && !seen.has(trimmed)) {
      seen.add(trimmed);
      result.push(trimmed);
    }
  }
  return result;
}

/** Drops any collection slugs that don't correspond to real collection data —
 * called by the page after loading collections, so an old/invalid slug in a
 * shared URL is ignored rather than silently "matching nothing" forever. */
export function intersectValidCollections(
  filters: FilterState,
  validSlugs: string[],
): FilterState {
  const validSet = new Set(validSlugs);
  return {
    ...filters,
    collection: filters.collection.filter((slug) => validSet.has(slug)),
  };
}

function serialiseRange(range: NumericRange | undefined): string | undefined {
  if (!range) return undefined;
  const { min, max } = range;
  if (min === undefined && max === undefined) return undefined;
  return `${min ?? ""}-${max ?? ""}`;
}

/**
 * Serialises a `FilterState` back to a query string, always in
 * `filterParamOrder`, omitting any param at its default/empty value — so
 * clearing the last value of a facet removes that param entirely rather than
 * leaving `?mount=` behind.
 */
export function serializeFilters(filters: FilterState): string {
  const parts: string[] = [];
  const raw: Record<(typeof filterParamOrder)[number], string | undefined> = {
    mount: filters.mount.length ? filters.mount.join(",") : undefined,
    placement: filters.placement.length
      ? filters.placement.join(",")
      : undefined,
    colour: filters.colour.length ? filters.colour.join(",") : undefined,
    collection: filters.collection.length
      ? filters.collection.join(",")
      : undefined,
    price: serialiseRange(filters.price),
    width: serialiseRange(filters.width),
    height: serialiseRange(filters.height),
    sort: filters.sort !== defaultSort ? filters.sort : undefined,
    page: filters.page !== 1 ? String(filters.page) : undefined,
  };
  for (const key of filterParamOrder) {
    const value = raw[key];
    if (value !== undefined) parts.push(`${key}=${encodeURIComponent(value)}`);
  }
  return parts.join("&");
}

export function buildFilterHref(
  basePath: string,
  filters: FilterState,
): string {
  const query = serializeFilters(filters);
  return query ? `${basePath}?${query}` : basePath;
}

// --- state transforms (pure — used by both desktop sidebar and mobile drawer) ---

export function toggleMultiValue<T extends string>(list: T[], value: T): T[] {
  return list.includes(value)
    ? list.filter((v) => v !== value)
    : [...list, value];
}

export function clearAllFilters(filters: FilterState): FilterState {
  return { ...emptyFilterState(), sort: filters.sort };
}

export type ActiveFilterChip = {
  key:
    | "mount"
    | "placement"
    | "colour"
    | "collection"
    | "price"
    | "width"
    | "height";
  value: string;
};

/** Flat list of removable chips for the active-filters row, in stable order. */
export function listActiveChips(filters: FilterState): ActiveFilterChip[] {
  const chips: ActiveFilterChip[] = [];
  for (const value of filters.mount) chips.push({ key: "mount", value });
  for (const value of filters.placement)
    chips.push({ key: "placement", value });
  for (const value of filters.colour) chips.push({ key: "colour", value });
  for (const value of filters.collection)
    chips.push({ key: "collection", value });
  if (filters.price)
    chips.push({ key: "price", value: rangeValueKey(filters.price) });
  if (filters.width)
    chips.push({ key: "width", value: rangeValueKey(filters.width) });
  if (filters.height)
    chips.push({ key: "height", value: rangeValueKey(filters.height) });
  return chips;
}

function rangeValueKey(range: NumericRange): string {
  return `${range.min ?? ""}-${range.max ?? ""}`;
}

export function removeChip(
  filters: FilterState,
  chip: ActiveFilterChip,
): FilterState {
  switch (chip.key) {
    case "mount":
      return {
        ...filters,
        mount: filters.mount.filter((v) => v !== chip.value),
        page: 1,
      };
    case "placement":
      return {
        ...filters,
        placement: filters.placement.filter((v) => v !== chip.value),
        page: 1,
      };
    case "colour":
      return {
        ...filters,
        colour: filters.colour.filter((v) => v !== chip.value),
        page: 1,
      };
    case "collection":
      return {
        ...filters,
        collection: filters.collection.filter((v) => v !== chip.value),
        page: 1,
      };
    case "price":
      return { ...filters, price: undefined, page: 1 };
    case "width":
      return { ...filters, width: undefined, page: 1 };
    case "height":
      return { ...filters, height: undefined, page: 1 };
  }
}

export function hasActiveFilters(filters: FilterState): boolean {
  return listActiveChips(filters).length > 0;
}

// --- applying filters/sort to real product data ---

function inRange(
  value: number | undefined,
  range: NumericRange | undefined,
): boolean {
  if (!range) return true;
  if (value === undefined) return false;
  if (range.min !== undefined && value < range.min) return false;
  if (range.max !== undefined && value > range.max) return false;
  return true;
}

export function productMatchesFilters(
  product: Product,
  filters: FilterState,
  collectionMembership: (slug: string) => string[],
): boolean {
  if (filters.mount.length > 0) {
    if (!product.sinkType || !filters.mount.includes(product.sinkType))
      return false;
  }
  if (filters.placement.length > 0) {
    if (
      !product.planterPlacement ||
      !filters.placement.includes(product.planterPlacement)
    )
      return false;
  }
  if (filters.colour.length > 0) {
    const has = (v: ColourFilterValue) =>
      v === "base" ? true : Boolean(product.customColour);
    if (!filters.colour.some(has)) return false;
  }
  if (filters.collection.length > 0) {
    const memberOf = collectionMembership(product.slug);
    if (!filters.collection.some((slug) => memberOf.includes(slug)))
      return false;
  }
  const cheapestPrice = product.customColour
    ? Math.min(product.base.price, product.customColour.price)
    : product.base.price;
  if (!inRange(cheapestPrice, filters.price)) return false;
  if (!inRange(product.widthCm, filters.width)) return false;
  if (!inRange(product.heightCm, filters.height)) return false;
  return true;
}

export function applyFilters(
  products: Product[],
  filters: FilterState,
  collectionMembership: (slug: string) => string[] = () => [],
): Product[] {
  return products.filter((product) =>
    productMatchesFilters(product, filters, collectionMembership),
  );
}

export function sortProducts(products: Product[], sort: SortOption): Product[] {
  const sorted = [...products];
  switch (sort) {
    case "price-asc":
      sorted.sort((a, b) => a.base.price - b.base.price);
      break;
    case "price-desc":
      sorted.sort((a, b) => b.base.price - a.base.price);
      break;
    case "name-asc":
      sorted.sort((a, b) => a.name.localeCompare(b.name, "uk"));
      break;
    case "featured":
    default:
      // Stable, source-file order — no popularity/bestseller data exists to
      // rank by, so "featured" is simply the catalog's authored order.
      break;
  }
  return sorted;
}

// --- faceted counts (for the sidebar/drawer: values + counts + disabled) ---

export type FacetOption<T extends string> = {
  value: T;
  count: number;
  disabled: boolean;
};

function countMatches(
  products: Product[],
  filtersWithoutThisFacet: FilterState,
  collectionMembership: (slug: string) => string[],
  predicate: (product: Product) => boolean,
): number {
  return applyFilters(
    products,
    filtersWithoutThisFacet,
    collectionMembership,
  ).filter(predicate).length;
}

export function computeMountFacet(
  products: Product[],
  filters: FilterState,
  collectionMembership: (slug: string) => string[],
): FacetOption<SinkType>[] {
  const without = { ...filters, mount: [] };
  return sinkTypes.map((value) => {
    const count = countMatches(
      products,
      without,
      collectionMembership,
      (p) => p.sinkType === value,
    );
    return { value, count, disabled: count === 0 };
  });
}

export function computePlacementFacet(
  products: Product[],
  filters: FilterState,
  collectionMembership: (slug: string) => string[],
): FacetOption<PlanterPlacement>[] {
  const without = { ...filters, placement: [] };
  return planterPlacements.map((value) => {
    const count = countMatches(
      products,
      without,
      collectionMembership,
      (p) => p.planterPlacement === value,
    );
    return { value, count, disabled: count === 0 };
  });
}

export function computeColourFacet(
  products: Product[],
  filters: FilterState,
  collectionMembership: (slug: string) => string[],
): FacetOption<ColourFilterValue>[] {
  const without = { ...filters, colour: [] };
  return colourFilterValues.map((value) => {
    const count = countMatches(products, without, collectionMembership, (p) =>
      value === "base" ? true : Boolean(p.customColour),
    );
    return { value, count, disabled: count === 0 };
  });
}

export function computeCollectionFacet(
  products: Product[],
  filters: FilterState,
  collectionSlugs: string[],
  collectionMembership: (slug: string) => string[],
): FacetOption<string>[] {
  const without = { ...filters, collection: [] };
  return collectionSlugs.map((value) => {
    const count = countMatches(products, without, collectionMembership, (p) =>
      collectionMembership(p.slug).includes(value),
    );
    return { value, count, disabled: count === 0 };
  });
}

export const DEFAULT_PAGE_SIZE = 12;

export function paginate<T>(
  items: T[],
  page: number,
  pageSize: number = DEFAULT_PAGE_SIZE,
): { pageItems: T[]; totalPages: number; currentPage: number } {
  const totalPages = Math.max(1, Math.ceil(items.length / pageSize));
  const currentPage = Math.min(Math.max(1, page), totalPages);
  const start = (currentPage - 1) * pageSize;
  return {
    pageItems: items.slice(start, start + pageSize),
    totalPages,
    currentPage,
  };
}
