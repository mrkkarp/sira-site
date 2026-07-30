"use client";

import { useRouter } from "next/navigation";
import type { Dictionary } from "@/i18n/get-dictionary";
import {
  buildFilterHref,
  sortOptions,
  type FilterState,
  type SortOption,
} from "@/lib/shop-filters";
import { Select } from "@/components/ui/select";
import { VisuallyHidden } from "@/components/ui/visually-hidden";

export function SortSelect({
  basePath,
  dictionary,
  filters,
}: {
  basePath: string;
  dictionary: Dictionary;
  filters: FilterState;
}) {
  const router = useRouter();
  const sortCopy = dictionary.shop.sort;
  const labels: Record<SortOption, string> = {
    featured: sortCopy.featured,
    "price-asc": sortCopy.priceAsc,
    "price-desc": sortCopy.priceDesc,
    "name-asc": sortCopy.nameAsc,
  };

  return (
    <label className="type-body-sm text-text-muted flex items-center gap-(--space-2xs)">
      <VisuallyHidden>{dictionary.shop.sortLabel}</VisuallyHidden>
      <span aria-hidden="true" className="hidden sm:inline">
        {dictionary.shop.sortLabel}
      </span>
      <Select
        value={filters.sort}
        onChange={(event) => {
          const next: FilterState = {
            ...filters,
            sort: event.target.value as SortOption,
            page: 1,
          };
          router.push(buildFilterHref(basePath, next), { scroll: false });
        }}
        options={sortOptions.map((option) => ({
          value: option,
          label: labels[option],
        }))}
        className="w-auto min-w-40"
      />
    </label>
  );
}
