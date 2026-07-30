import type { Locale } from "@/i18n/config";
import type { Dictionary } from "@/i18n/get-dictionary";
import type { Product, ShopCategory } from "@/lib/schemas/product";
import type { FilterState } from "@/lib/shop-filters";
import { localeHref } from "@/lib/locale-href";
import { shopCategoryLabel } from "@/lib/shop-category-label";
import { formatTemplate } from "@/lib/format-template";
import { Breadcrumbs } from "@/components/ui/breadcrumbs";
import { CategoryNav } from "@/components/shop/category-nav";
import { SortSelect } from "@/components/shop/sort-select";
import { MobileFilterButton } from "@/components/shop/mobile-filter-button";
import type { ShopFacets } from "@/components/shop/filter-fieldsets";

/**
 * Shared top-of-page composition for `/shop` and `/shop/[category]`
 * (Prompt 5 §1): breadcrumbs, H1, a short intro (never the whole first
 * screen — one paragraph, `max-w`-capped), the real result count, the
 * optional category nav, and the sort/mobile-filter controls row.
 */
export function ShopPageHeader({
  locale,
  dictionary,
  category,
  intro,
  resultsCount,
  basePath,
  filters,
  facets,
  allProducts,
  collectionMembershipMap,
}: {
  locale: Locale;
  dictionary: Dictionary;
  category?: ShopCategory;
  intro: string;
  resultsCount: number;
  basePath: string;
  filters: FilterState;
  facets: ShopFacets;
  allProducts: Product[];
  collectionMembershipMap: Record<string, string[]>;
}) {
  const heading = category
    ? shopCategoryLabel(category, dictionary)
    : dictionary.shop.heading;
  const crumbs = [
    { label: dictionary.shop.breadcrumbHome, href: localeHref(locale, "/") },
    category
      ? {
          label: dictionary.shop.breadcrumbShop,
          href: localeHref(locale, "/shop"),
        }
      : { label: dictionary.shop.breadcrumbShop },
    ...(category ? [{ label: heading }] : []),
  ];

  return (
    <div className="flex flex-col gap-(--space-md)">
      <Breadcrumbs items={crumbs} />
      <div className="flex flex-col gap-(--space-2xs)">
        <h1 className="type-h1 text-text">{heading}</h1>
        <p className="type-body text-text-muted max-w-2xl">{intro}</p>
      </div>
      <CategoryNav locale={locale} dictionary={dictionary} active={category} />
      <div className="border-border flex flex-wrap items-center justify-between gap-(--space-sm) border-y py-(--space-xs)">
        <div className="flex items-center gap-(--space-sm)">
          <MobileFilterButton
            basePath={basePath}
            dictionary={dictionary}
            category={category}
            facets={facets}
            filters={filters}
            allProducts={allProducts}
            collectionMembershipMap={collectionMembershipMap}
          />
          <p className="type-body-sm text-text-muted">
            {formatTemplate(dictionary.shop.resultsCount, {
              count: resultsCount,
            })}
          </p>
        </div>
        <SortSelect
          basePath={basePath}
          dictionary={dictionary}
          filters={filters}
        />
      </div>
    </div>
  );
}
