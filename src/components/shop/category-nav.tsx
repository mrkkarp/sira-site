import Link from "next/link";
import type { Locale } from "@/i18n/config";
import type { Dictionary } from "@/i18n/get-dictionary";
import type { ShopCategory } from "@/lib/schemas/product";
import {
  shopCategories,
  shopCategoryPath,
  shopSubcategoriesOf,
} from "@/lib/schemas/product";
import { localeHref } from "@/lib/locale-href";
import { shopCategoryLabel } from "@/lib/shop-category-label";
import { cn } from "@/lib/cn";

/**
 * Optional category navigation (Prompt 5 §1) — "All products" plus each of
 * the 7 real `ShopCategory` values, as plain links (no JS required).
 * Deliberately does not filter out `wall-modules` even though it currently
 * has zero real products — the category itself is real and should stay
 * reachable (its page shows the honest "empty category" state).
 *
 * A second row appears under the active category when it has subcategories
 * (`/rakovyny` → Підлогові / Накладні). That row is the *only* crawlable link
 * to those three URLs from inside the catalogue, and it is why they are links
 * and not a filter checkbox: a checkbox produces `?mount=countertop`, which is
 * a query string a crawler has no reason to follow.
 *
 * The base class string carries the border *width* only; the colour lives
 * entirely inside the active/inactive ternary, in both branches. `cn()` is a
 * plain join with no conflict resolution, so a `border-transparent` in the
 * base plus a `border-text` in the ternary would put two `border-color`
 * declarations of equal specificity on the same element — and the winner is
 * then decided by their order in Tailwind's generated stylesheet, not by the
 * order they appear here. `border-transparent` sorts later, so the active
 * underline lost and every category rendered identically. Keep every
 * mutually-exclusive property in the ternary, the way tabs.tsx,
 * product-gallery.tsx and colour-selector.tsx already do.
 */
export function CategoryNav({
  locale,
  dictionary,
  active,
  activeSubcategory,
}: {
  locale: Locale;
  dictionary: Dictionary;
  active?: ShopCategory;
  activeSubcategory?: string;
}) {
  const subcategories = active ? shopSubcategoriesOf(active) : [];

  return (
    <div className="flex flex-col gap-(--space-xs)">
      <nav aria-label={dictionary.shop.categoryNavHeading}>
        <ul className="type-nav flex flex-wrap gap-x-(--space-sm) gap-y-(--space-2xs)">
          <li>
            <Link
              href={localeHref(locale, "/shop")}
              aria-current={active === undefined ? "page" : undefined}
              className={cn(
                "border-b-2 pb-(--space-3xs) transition-colors duration-(--duration-fast)",
                active === undefined
                  ? "border-text text-text"
                  : "text-text-muted hover:text-text border-transparent",
              )}
            >
              {dictionary.shop.allCategoriesHeading}
            </Link>
          </li>
          {shopCategories.map((category) => (
            <li key={category}>
              <Link
                href={localeHref(locale, shopCategoryPath(category))}
                // A subcategory page is not the category page, so the parent
                // gets the active *styling* but not `aria-current="page"` —
                // that would tell a screen reader this link leads to where you
                // already are, when it actually leads one level up.
                aria-current={
                  active === category && !activeSubcategory ? "page" : undefined
                }
                className={cn(
                  "border-b-2 pb-(--space-3xs) transition-colors duration-(--duration-fast)",
                  active === category
                    ? "border-text text-text"
                    : "text-text-muted hover:text-text border-transparent",
                )}
              >
                {shopCategoryLabel(category, dictionary)}
              </Link>
            </li>
          ))}
        </ul>
      </nav>

      {subcategories.length > 0 ? (
        <nav aria-label={dictionary.shop.subcategoryNavHeading}>
          <ul className="type-body-sm flex flex-wrap gap-x-(--space-sm) gap-y-(--space-3xs)">
            {subcategories.map((subcategory) => (
              <li key={subcategory.slug}>
                <Link
                  href={localeHref(
                    locale,
                    shopCategoryPath(subcategory.category, subcategory.slug),
                  )}
                  aria-current={
                    activeSubcategory === subcategory.slug ? "page" : undefined
                  }
                  className={cn(
                    "underline-offset-4 transition-colors duration-(--duration-fast)",
                    activeSubcategory === subcategory.slug
                      ? "text-text underline"
                      : "text-text-muted hover:text-text",
                  )}
                >
                  {
                    dictionary.shop.subcategories[subcategory.dictionaryKey]
                      .navLabel
                  }
                </Link>
              </li>
            ))}
          </ul>
        </nav>
      ) : null}
    </div>
  );
}
