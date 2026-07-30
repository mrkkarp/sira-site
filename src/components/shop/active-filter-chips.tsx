import Link from "next/link";
import type { Dictionary } from "@/i18n/get-dictionary";
import type { ActiveFilterChip, FilterState } from "@/lib/shop-filters";
import {
  buildFilterHref,
  listActiveChips,
  removeChip,
  clearAllFilters,
  hasActiveFilters,
} from "@/lib/shop-filters";

/**
 * Plain `<Link>` chips — no client JS required to remove a single filter,
 * matching the rest of this project's progressive-enhancement precedent
 * (Pagination, Breadcrumbs are also plain links).
 */
export function ActiveFilterChips({
  basePath,
  dictionary,
  filters,
  chipLabel,
}: {
  basePath: string;
  dictionary: Dictionary;
  filters: FilterState;
  chipLabel: (chip: ActiveFilterChip) => string;
}) {
  const chips = listActiveChips(filters);
  if (chips.length === 0) return null;

  return (
    <div className="flex flex-wrap items-center gap-(--space-2xs)">
      {chips.map((chip) => (
        <Link
          key={`${chip.key}-${chip.value}`}
          href={buildFilterHref(basePath, removeChip(filters, chip))}
          scroll={false}
          className="border-border-strong type-caption hover:border-text inline-flex items-center gap-(--space-3xs) border px-(--space-2xs) py-(--space-3xs) transition-colors duration-(--duration-fast)"
        >
          <span>{chipLabel(chip)}</span>
          <span aria-hidden="true">×</span>
          <span className="sr-only">
            {dictionary.shop.activeFilters.removeLabel}: {chipLabel(chip)}
          </span>
        </Link>
      ))}
      {hasActiveFilters(filters) ? (
        <Link
          href={buildFilterHref(basePath, clearAllFilters(filters))}
          scroll={false}
          className="type-caption text-text-muted hover:text-text underline underline-offset-4"
        >
          {dictionary.shop.filters.clearAll}
        </Link>
      ) : null}
    </div>
  );
}
