import type { Locale } from "@/i18n/config";
import type { Dictionary } from "@/i18n/get-dictionary";
import type {
  Product,
  ShopCategory,
  ShopSubcategory,
} from "@/lib/schemas/product";
import type { FilterState } from "@/lib/shop-filters";
import { buildShopCrumbs } from "@/lib/shop-breadcrumbs";
import { formatTemplate } from "@/lib/format-template";
import { Breadcrumbs } from "@/components/ui/breadcrumbs";
import { CategoryNav } from "@/components/shop/category-nav";
import { SortSelect } from "@/components/shop/sort-select";
import { MobileFilterButton } from "@/components/shop/mobile-filter-button";
import type { ShopFacets } from "@/components/shop/filter-fieldsets";

/**
 * Shared top-of-page composition for `/shop`, `/[category]` and
 * `/[category]/[subcategory]` (Prompt 5 §1): breadcrumbs, H1, a short intro
 * (never the whole first screen — one paragraph, `max-w`-capped), the real
 * result count, the category nav, and the sort/mobile-filter controls row.
 *
 * `heading` arrives as a prop rather than being derived here: `ShopCatalog`
 * already computed it for the `<title>`, the JSON-LD `CollectionPage` name
 * and the breadcrumb trail, and a second derivation is a second place for the
 * `h1` to drift away from the three of them.
 */
export function ShopPageHeader({
  locale,
  dictionary,
  category,
  subcategory,
  heading,
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
  subcategory?: ShopSubcategory;
  heading: string;
  intro: string;
  resultsCount: number;
  basePath: string;
  filters: FilterState;
  facets: ShopFacets;
  allProducts: Product[];
  collectionMembershipMap: Record<string, string[]>;
}) {
  const crumbs = buildShopCrumbs({
    locale,
    dictionary,
    category,
    subcategory,
    heading,
  });

  return (
    <div className="flex flex-col gap-(--space-md)">
      <Breadcrumbs items={crumbs} />
      <div className="flex flex-col gap-(--space-2xs)">
        <h1 className="type-h1 text-text">{heading}</h1>
        <p className="type-body text-text-muted max-w-2xl">{intro}</p>
      </div>
      <CategoryNav
        locale={locale}
        dictionary={dictionary}
        active={category}
        activeSubcategory={subcategory?.slug}
      />
      <div className="border-border flex flex-wrap items-center justify-between gap-(--space-sm) border-y py-(--space-xs)">
        <div className="flex items-center gap-(--space-sm)">
          <MobileFilterButton
            basePath={basePath}
            dictionary={dictionary}
            category={category}
            lockedFacet={subcategory?.facet}
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
