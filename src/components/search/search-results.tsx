import type { Locale } from "@/i18n/config";
import type { Dictionary } from "@/i18n/get-dictionary";
import { getAllProducts } from "@/lib/products";
import { getAllProductColours } from "@/lib/product-colours";
import { searchCatalog } from "@/lib/search";
import { localeHref } from "@/lib/locale-href";
import { formatTemplate } from "@/lib/format-template";
import { Container, Section } from "@/components/layout";
import { Breadcrumbs } from "@/components/ui/breadcrumbs";
import { EmptyState } from "@/components/ui/empty-state";
import { TextLink } from "@/components/ui/text-link";
import { ProductGrid } from "@/components/shop/product-grid";

/** No preview cap here — unlike the header drawer's `MAX_RESULTS_PER_GROUP`
 * of 6, the dedicated results page is where a shopper expects to see every
 * real match, so this is high enough to not truncate the real catalog
 * (currently well under 100 products) while still bounding the grid. */
const RESULTS_PAGE_LIMIT = 100;

/**
 * `/search` results page body (Phase H) — server-rendered off the same
 * `searchCatalog()` matcher the header drawer's `/api/search` route uses,
 * so the two never drift. Reuses `ProductGrid`/`ProductCard` for products
 * (the same tiles the `/shop` catalog renders) rather than inventing a
 * second product-tile layout just for this page.
 */
export function SearchResults({
  query,
  locale,
  dictionary,
}: {
  query: string;
  locale: Locale;
  dictionary: Dictionary;
}) {
  const s = dictionary.search;
  const trimmedQuery = query.trim();
  const { products, pages } = trimmedQuery
    ? searchCatalog(trimmedQuery, {
        products: getAllProducts(),
        colours: getAllProductColours(),
        dictionary,
        limit: RESULTS_PAGE_LIMIT,
      })
    : { products: [], pages: [] };

  const resultsCount = products.length + pages.length;
  const heading = trimmedQuery
    ? formatTemplate(s.resultsForTemplate, { query: trimmedQuery })
    : s.title;

  return (
    <Section spacing="lg">
      <Container className="flex flex-col gap-(--space-lg)">
        <div className="flex flex-col gap-(--space-2xs)">
          <Breadcrumbs
            items={[
              {
                label: dictionary.shop.breadcrumbHome,
                href: localeHref(locale, "/"),
              },
              { label: s.title },
            ]}
          />
          <h1 className="type-h1 text-text">{heading}</h1>
          {trimmedQuery ? (
            <p className="type-body text-text-muted">
              {formatTemplate(s.resultsCount, { count: resultsCount })}
            </p>
          ) : null}
        </div>

        {!trimmedQuery || resultsCount === 0 ? (
          <EmptyState
            heading={s.noResultsHeading}
            description={s.noResultsBody}
            action={
              <TextLink href={localeHref(locale, "/shop")} variant="underlined">
                {s.browseShopCta}
              </TextLink>
            }
          />
        ) : (
          <div className="flex flex-col gap-(--space-xl)">
            {products.length > 0 ? (
              <div className="flex flex-col gap-(--space-sm)">
                <h2 className="type-technical-label text-text-muted">
                  {s.productsHeading}
                </h2>
                <ProductGrid
                  products={products}
                  locale={locale}
                  dictionary={dictionary}
                />
              </div>
            ) : null}

            {pages.length > 0 ? (
              <div className="flex flex-col gap-(--space-xs)">
                <h2 className="type-technical-label text-text-muted">
                  {s.pagesHeading}
                </h2>
                <ul className="flex flex-col gap-(--space-2xs)">
                  {pages.map((page) => (
                    <li key={page.href}>
                      <TextLink
                        href={localeHref(locale, page.href)}
                        variant="underlined"
                      >
                        {page.title}
                      </TextLink>
                    </li>
                  ))}
                </ul>
              </div>
            ) : null}
          </div>
        )}
      </Container>
    </Section>
  );
}
