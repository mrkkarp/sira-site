"use client";

import { useRouter } from "next/navigation";
import type { Dictionary } from "@/i18n/get-dictionary";
import type { ShopCategory } from "@/lib/schemas/product";
import {
  buildFilterHref,
  clearAllFilters,
  hasActiveFilters,
  type FilterState,
} from "@/lib/shop-filters";
import {
  FilterFieldsets,
  type ShopFacets,
} from "@/components/shop/filter-fieldsets";

/**
 * Left sidebar, desktop only (hidden below `lg` — the mobile drawer takes
 * over there). Applies each change immediately via `router.push`, so
 * Back/Forward step through the filter history one change at a time.
 */
export function DesktopFilterSidebar({
  basePath,
  dictionary,
  category,
  facets,
  filters,
}: {
  basePath: string;
  dictionary: Dictionary;
  category?: ShopCategory;
  facets: ShopFacets;
  filters: FilterState;
}) {
  const router = useRouter();

  function apply(next: FilterState) {
    router.push(buildFilterHref(basePath, next), { scroll: false });
  }

  return (
    <aside className="hidden lg:sticky lg:top-(--header-stack-height) lg:block lg:h-fit lg:max-h-[calc(100svh-var(--header-stack-height)-var(--space-lg))] lg:w-72 lg:shrink-0 lg:overflow-y-auto lg:pb-(--space-lg)">
      <div className="mb-(--space-sm) flex items-center justify-between">
        <p className="type-h4 text-text">{dictionary.shop.filters.heading}</p>
        {hasActiveFilters(filters) ? (
          <button
            type="button"
            onClick={() => apply(clearAllFilters(filters))}
            className="type-nav text-text-muted hover:text-text underline underline-offset-4 transition-colors duration-(--duration-fast)"
          >
            {dictionary.shop.filters.clearAll}
          </button>
        ) : null}
      </div>
      {/* No `key` remount to reset the range inputs: `RangeField` now follows
          its committed `range` prop directly, which is the only thing that
          survives an async `router.push` landing after the remount. */}
      <FilterFieldsets
        dictionary={dictionary}
        category={category}
        facets={facets}
        value={filters}
        onChange={apply}
      />
    </aside>
  );
}
