import type { VariantSelection } from "@/lib/variant-model";

/**
 * Pure helpers for syncing a product's variant selection to the URL query
 * string (Prompt 6 §5 — "sync to URL; restore after refresh"). Framework-
 * free (no `next/navigation`) so they're unit-testable in isolation, same
 * convention as `src/lib/shop-filters.ts`'s `parseFilters`/`buildFilterHref`.
 *
 * Only reads/writes the option ids a product's real `VariantModel` actually
 * has (today, just "colour") — never invents a `mount`/`size`/`technical`
 * query param for a product that has no such selectable option.
 */
export function parseVariantSelectionFromSearchParams(
  searchParams: Record<string, string | string[] | undefined>,
  optionIds: string[],
): VariantSelection {
  const selection: VariantSelection = {};
  for (const id of optionIds) {
    const raw = searchParams[id];
    const value = Array.isArray(raw) ? raw[0] : raw;
    if (value) selection[id] = value;
  }
  return selection;
}

export function serializeVariantSelection(selection: VariantSelection): string {
  const params = new URLSearchParams();
  for (const [key, value] of Object.entries(selection)) {
    if (value) params.set(key, value);
  }
  return params.toString();
}

export function buildVariantHref(
  basePath: string,
  selection: VariantSelection,
): string {
  const query = serializeVariantSelection(selection);
  return query ? `${basePath}?${query}` : basePath;
}
