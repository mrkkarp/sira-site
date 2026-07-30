"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import type { Dictionary } from "@/i18n/get-dictionary";
import type { ShopCategory } from "@/lib/schemas/product";
import type { Product } from "@/lib/schemas/product";
import {
  applyFilters,
  buildFilterHref,
  clearAllFilters,
  listActiveChips,
  type FilterState,
} from "@/lib/shop-filters";
import {
  FilterFieldsets,
  type ShopFacets,
} from "@/components/shop/filter-fieldsets";
import { Drawer } from "@/components/ui/drawer";
import { buttonBaseClass, buttonVariantClass } from "@/components/ui/button";
import { formatTemplate } from "@/lib/format-template";
import { cn } from "@/lib/cn";

/**
 * Mobile "Filters" button + full-height drawer. Deliberately does NOT apply
 * each change immediately — the drawer holds its own pending `FilterState`
 * and only navigates once, when "Показати N виробів" is pressed, so the
 * product list doesn't rebuild on every tap (Prompt 5 §6).
 */
export function MobileFilterButton({
  basePath,
  dictionary,
  category,
  facets,
  filters,
  allProducts,
  collectionMembershipMap,
}: {
  basePath: string;
  dictionary: Dictionary;
  category?: ShopCategory;
  facets: ShopFacets;
  filters: FilterState;
  allProducts: Product[];
  /** Plain, serialisable `slug -> collection slugs` lookup — a function
   * reference can't cross the server/client boundary as a prop, so the
   * server passes this map instead and the client rebuilds a lookup fn. */
  collectionMembershipMap: Record<string, string[]>;
}) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [pending, setPending] = useState<FilterState>(filters);
  const [resetKey, setResetKey] = useState(0);

  const collectionMembership = (slug: string) =>
    collectionMembershipMap[slug] ?? [];
  const activeCount = listActiveChips(filters).length;
  const matchCount = applyFilters(
    allProducts,
    pending,
    collectionMembership,
  ).length;
  const copy = dictionary.shop.filters;

  function openDrawer() {
    setPending(filters);
    setResetKey((k) => k + 1);
    setOpen(true);
  }

  function apply() {
    router.push(buildFilterHref(basePath, pending), { scroll: false });
    setOpen(false);
  }

  function clear() {
    const cleared = clearAllFilters(pending);
    setPending(cleared);
    setResetKey((k) => k + 1);
  }

  return (
    <>
      {/* Prompt 9 §6 (visual consistency audit) — reuse the shared
          `Button` color/behaviour tokens (`buttonBaseClass` +
          `buttonVariantClass.outline`) instead of hand-duplicating them, but
          keep this control's own drawer-specific sizing (`h-11`, fluid
          `px-(--space-sm)`, `lg:hidden`) rather than forcing it through the
          `Button` component's fixed `md`/`sm` size scale. */}
      <button
        type="button"
        onClick={openDrawer}
        className={cn(
          buttonBaseClass,
          buttonVariantClass.outline,
          "h-11 px-(--space-sm) lg:hidden",
        )}
      >
        {activeCount > 0
          ? formatTemplate(dictionary.shop.filtersButtonWithCount, {
              count: activeCount,
            })
          : dictionary.shop.filtersButton}
      </button>

      <Drawer
        open={open}
        onClose={() => setOpen(false)}
        title={copy.heading}
        closeLabel={copy.closeLabel}
        side="left"
      >
        <div
          className="flex h-[calc(100%-4rem)] flex-col"
          style={{ paddingBottom: "env(safe-area-inset-bottom)" }}
        >
          <div className="flex-1 overflow-y-auto pb-(--space-md)">
            <FilterFieldsets
              key={resetKey}
              dictionary={dictionary}
              category={category}
              facets={facets}
              value={pending}
              onChange={setPending}
            />
          </div>
          <div className="border-border bg-surface sticky bottom-0 flex gap-(--space-sm) border-t pt-(--space-sm)">
            <button
              type="button"
              onClick={clear}
              className={cn(
                buttonBaseClass,
                buttonVariantClass.outline,
                "h-12 flex-1 px-(--space-sm)",
              )}
            >
              {copy.clearAll}
            </button>
            <button
              type="button"
              onClick={apply}
              className={cn(
                buttonBaseClass,
                buttonVariantClass["primary-dark"],
                "h-12 flex-1 px-(--space-sm)",
              )}
            >
              {formatTemplate(copy.applyCtaWithCount, { count: matchCount })}
            </button>
          </div>
        </div>
      </Drawer>
    </>
  );
}
