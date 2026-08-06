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
/**
 * Reads a selection out of a raw query string — `window.location.search`, or
 * anything else `URLSearchParams` accepts.
 *
 * This used to take a page's `searchParams` prop and run on the server. It
 * doesn't any more, because nothing on this route is allowed to look at the
 * query string there: `/products/[slug]` is prerendered, and a single
 * `await searchParams` is all it takes to opt a route back out of that.
 * Restoring a shared `?colour=…` link is the browser's job now — see the
 * `useEffect` in `ProductExperience`.
 *
 * A repeated key (`?colour=a&colour=b`) resolves to the first value, which is
 * both what `URLSearchParams.get` does and what the array-taking-`[0]`
 * predecessor did.
 */
export function parseVariantSelectionFromQueryString(
  search: string,
  optionIds: string[],
): VariantSelection {
  const params = new URLSearchParams(search);
  const selection: VariantSelection = {};
  for (const id of optionIds) {
    const value = params.get(id);
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
