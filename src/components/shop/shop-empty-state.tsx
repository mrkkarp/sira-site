import Link from "next/link";
import type { Locale } from "@/i18n/config";
import type { Dictionary } from "@/i18n/get-dictionary";
import type { ShopCategory } from "@/lib/schemas/product";
import { shopCategories } from "@/lib/schemas/product";
import { localeHref } from "@/lib/locale-href";
import { shopCategoryLabel } from "@/lib/shop-category-label";
import { EmptyState } from "@/components/ui/empty-state";
import { TextLink } from "@/components/ui/text-link";

/**
 * Prompt 5 §12 — two distinct empty states, never a blank page:
 *  - `emptyCategory`: the category genuinely has no real products yet
 *    (currently true only for `wall-modules`).
 *  - `noResults`: the category has products, but the active filter
 *    combination matches none of them — offers a "clear filters" CTA and
 *    links to the other real categories so the visitor isn't stuck.
 */
export function ShopEmptyState({
  variant,
  locale,
  dictionary,
  category,
  clearFiltersHref,
}: {
  variant: "empty-category" | "no-results";
  locale: Locale;
  dictionary: Dictionary;
  category?: ShopCategory;
  clearFiltersHref?: string;
}) {
  const copy = dictionary.shop.states;

  if (variant === "empty-category") {
    return (
      <div className="flex flex-col gap-(--space-md)">
        <EmptyState
          heading={copy.emptyCategoryHeading}
          description={copy.emptyCategoryBody}
        />
        <NearbyCategories
          locale={locale}
          dictionary={dictionary}
          exclude={category}
        />
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-(--space-md)">
      <EmptyState
        heading={copy.noResultsHeading}
        description={copy.noResultsBody}
        action={
          clearFiltersHref ? (
            <TextLink href={clearFiltersHref} variant="underlined">
              {copy.noResultsClearCta}
            </TextLink>
          ) : undefined
        }
      />
      <NearbyCategories
        locale={locale}
        dictionary={dictionary}
        exclude={category}
      />
    </div>
  );
}

function NearbyCategories({
  locale,
  dictionary,
  exclude,
}: {
  locale: Locale;
  dictionary: Dictionary;
  exclude?: ShopCategory;
}) {
  const others = shopCategories.filter((category) => category !== exclude);
  if (others.length === 0) return null;

  return (
    <div className="flex flex-col items-center gap-(--space-2xs)">
      <p className="type-label text-text-muted">
        {dictionary.shop.states.nearbyHeading}
      </p>
      <ul className="flex flex-wrap justify-center gap-(--space-2xs)">
        {others.map((category) => (
          <li key={category}>
            <Link
              href={localeHref(locale, `/shop/${category}`)}
              className="border-border-strong type-caption hover:border-text inline-flex items-center border px-(--space-2xs) py-(--space-3xs) transition-colors duration-(--duration-fast)"
            >
              {shopCategoryLabel(category, dictionary)}
            </Link>
          </li>
        ))}
      </ul>
    </div>
  );
}
