import type { Locale } from "@/i18n/config";
import type { Dictionary } from "@/i18n/get-dictionary";
import type { ShopCategory, ShopSubcategory } from "@/lib/schemas/product";
import { shopCategoryPath } from "@/lib/schemas/product";
import {
  getAllProducts,
  getProductsByCategory,
  getProductsBySubcategory,
  preloadProducts,
} from "@/lib/products";
import { localeHref } from "@/lib/locale-href";
import {
  parseFilters,
  intersectValidCollections,
  applyFilters,
  sortProducts,
  paginate,
  clearAllFilters,
  buildFilterHref,
  hasActiveFilters,
  DEFAULT_PAGE_SIZE,
} from "@/lib/shop-filters";
import { buildShopFacets, collectionMembership } from "@/lib/shop-facets";
import { getAllCollections } from "@/lib/collections";
import { chipLabel } from "@/lib/shop-chip-labels";
import {
  shopCategoryLabel,
  shopCategoryIntro,
  shopSubcategoryLabel,
  shopSubcategoryIntro,
} from "@/lib/shop-category-label";
import {
  buildShopBreadcrumbItems,
  buildShopCrumbs,
} from "@/lib/shop-breadcrumbs";
import { Container, Section } from "@/components/layout";
import { ShopPageHeader } from "@/components/shop/shop-page-header";
import { DesktopFilterSidebar } from "@/components/shop/desktop-filter-sidebar";
import { ActiveFilterChips } from "@/components/shop/active-filter-chips";
import { ProductGrid } from "@/components/shop/product-grid";
import { ShopEmptyState } from "@/components/shop/shop-empty-state";
import { CategoryNav } from "@/components/shop/category-nav";
import { Breadcrumbs } from "@/components/ui/breadcrumbs";
import { Pagination } from "@/components/ui/pagination";
import { currencySuffix } from "@/components/ui/price";
import { BreadcrumbStructuredData } from "@/components/seo/breadcrumb-structured-data";
import { CollectionStructuredData } from "@/components/seo/collection-structured-data";

/**
 * The single reusable catalog page body — used by `/shop` (no `category`),
 * `/[category]` and `/[category]/[subcategory]`, per Prompt 5's explicit "one
 * reusable collection architecture, not per-category page copies"
 * requirement. All server-side: filtering/sorting/pagination happen here,
 * not in the browser, so the grid never needs to re-fetch or hydrate just
 * to show the right products.
 *
 * A `subcategory` narrows `category` by exactly one facet. The narrowing is
 * applied to the product set *before* anything else, so the sort, the result
 * count, the facet counts and the pagination all describe the subcategory and
 * not its parent — and so `/rakovyny/nakladni?price=…` composes correctly
 * instead of quietly widening back out to every sink.
 */
export async function ShopCatalog({
  locale,
  dictionary,
  category,
  subcategory,
  searchParams,
}: {
  locale: Locale;
  dictionary: Dictionary;
  category?: ShopCategory;
  subcategory?: ShopSubcategory;
  searchParams: Record<string, string | string[] | undefined>;
}) {
  await preloadProducts(locale);
  const basePath = localeHref(
    locale,
    category ? shopCategoryPath(category, subcategory?.slug) : "/shop",
  );
  const categoryProducts = subcategory
    ? getProductsBySubcategory(subcategory)
    : category
      ? getProductsByCategory(category)
      : getAllProducts();
  const collectionSlugs = getAllCollections().map(
    (collection) => collection.slug,
  );

  const parsed = parseFilters(searchParams);
  const filters = intersectValidCollections(parsed, collectionSlugs);

  const heading = subcategory
    ? shopSubcategoryLabel(subcategory, dictionary)
    : category
      ? shopCategoryLabel(category, dictionary)
      : dictionary.shop.heading;
  const breadcrumbItems = buildShopBreadcrumbItems({
    locale,
    dictionary,
    category,
    subcategory,
    heading,
  });

  // A genuinely empty category (currently only `wall-modules`) — show the
  // honest empty state instead of a filter sidebar with nothing to filter.
  if (categoryProducts.length === 0) {
    return (
      <Section spacing="lg">
        <Container className="flex flex-col gap-(--space-lg)">
          <BreadcrumbStructuredData items={breadcrumbItems} />
          <ShopPageHeaderStatic
            locale={locale}
            dictionary={dictionary}
            category={category}
            subcategory={subcategory}
          />
          <ShopEmptyState
            variant="empty-category"
            locale={locale}
            dictionary={dictionary}
            category={category}
          />
        </Container>
      </Section>
    );
  }

  const filteredUnsorted = applyFilters(
    categoryProducts,
    filters,
    collectionMembership,
  );
  const sorted = sortProducts(filteredUnsorted, filters.sort);
  const { pageItems, totalPages, currentPage } = paginate(sorted, filters.page);
  const facets = buildShopFacets(categoryProducts, filters);
  const intro = subcategory
    ? shopSubcategoryIntro(subcategory, dictionary)
    : category
      ? shopCategoryIntro(category, dictionary)
      : dictionary.shop.allCategoriesIntro;
  // Plain, serialisable lookup for the client-side mobile drawer — a
  // function reference can't cross the server/client component boundary.
  const collectionMembershipMap = Object.fromEntries(
    categoryProducts.map((product) => [
      product.slug,
      collectionMembership(product.slug),
    ]),
  );

  return (
    <Section spacing="lg">
      <Container className="flex flex-col gap-(--space-lg)">
        <BreadcrumbStructuredData items={breadcrumbItems} />
        {pageItems.length > 0 ? (
          <CollectionStructuredData
            name={heading}
            description={intro}
            path={basePath}
            items={pageItems.map((product) => ({
              name: product.name,
              path: localeHref(locale, `/products/${product.slug}`),
            }))}
            startPosition={(currentPage - 1) * DEFAULT_PAGE_SIZE + 1}
          />
        ) : null}
        <ShopPageHeader
          locale={locale}
          dictionary={dictionary}
          category={category}
          subcategory={subcategory}
          heading={heading}
          intro={intro}
          resultsCount={sorted.length}
          basePath={basePath}
          filters={filters}
          facets={facets}
          allProducts={categoryProducts}
          collectionMembershipMap={collectionMembershipMap}
        />

        <ActiveFilterChips
          basePath={basePath}
          dictionary={dictionary}
          filters={filters}
          chipLabel={(chip) =>
            chipLabel(
              chip,
              dictionary,
              Object.fromEntries(
                getAllCollections().map((c) => [c.slug, c.name]),
              ),
              { price: currencySuffix[locale], width: "см", height: "см" },
            )
          }
        />

        <div className="flex flex-col gap-(--space-lg) lg:flex-row lg:items-start lg:gap-(--space-xl)">
          <DesktopFilterSidebar
            basePath={basePath}
            dictionary={dictionary}
            category={category}
            lockedFacet={subcategory?.facet}
            facets={facets}
            filters={filters}
          />

          <div className="min-w-0 flex-1">
            {pageItems.length === 0 ? (
              <ShopEmptyState
                variant="no-results"
                locale={locale}
                dictionary={dictionary}
                category={category}
                clearFiltersHref={
                  hasActiveFilters(filters)
                    ? buildFilterHref(basePath, clearAllFilters(filters))
                    : undefined
                }
              />
            ) : (
              <>
                {/* Visually hidden, but a real level-2 heading: the cards are
                    `h3`, so without it the page jumped `h1` → `h3` and someone
                    navigating by heading had no marker for where the filter
                    sidebar ends and the results begin. */}
                <h2 className="sr-only">{dictionary.shop.gridHeading}</h2>
                <ProductGrid
                  products={pageItems}
                  locale={locale}
                  dictionary={dictionary}
                />
                <div className="mt-(--space-lg) flex justify-center">
                  <Pagination
                    currentPage={currentPage}
                    totalPages={totalPages}
                    label={dictionary.shop.pagination.label}
                    prevLabel={dictionary.shop.pagination.prevLabel}
                    nextLabel={dictionary.shop.pagination.nextLabel}
                    getHref={(page) =>
                      buildFilterHref(basePath, { ...filters, page })
                    }
                  />
                </div>
              </>
            )}
          </div>
        </div>
      </Container>
    </Section>
  );
}

/** Minimal header for the empty-category case — no filters/sort/results
 * count to show since there is nothing to filter or sort yet. */
function ShopPageHeaderStatic({
  locale,
  dictionary,
  category,
  subcategory,
}: {
  locale: Locale;
  dictionary: Dictionary;
  category?: ShopCategory;
  subcategory?: ShopSubcategory;
}) {
  const heading = subcategory
    ? shopSubcategoryLabel(subcategory, dictionary)
    : category
      ? shopCategoryLabel(category, dictionary)
      : dictionary.shop.heading;
  const crumbs = buildShopCrumbs({
    locale,
    dictionary,
    category,
    subcategory,
    heading,
  });
  const intro = subcategory
    ? shopSubcategoryIntro(subcategory, dictionary)
    : category
      ? shopCategoryIntro(category, dictionary)
      : dictionary.shop.allCategoriesIntro;

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
    </div>
  );
}

