import Link from "next/link";
import type { Locale } from "@/i18n/config";
import type { Dictionary } from "@/i18n/get-dictionary";
import type { ShopCategory } from "@/lib/schemas/product";
import { shopCategories } from "@/lib/schemas/product";
import { localeHref } from "@/lib/locale-href";
import { shopCategoryLabel } from "@/lib/shop-category-label";
import { cn } from "@/lib/cn";

/**
 * Optional category navigation (Prompt 5 §1) — "All products" plus each of
 * the 7 real `ShopCategory` values, as plain links (no JS required).
 * Deliberately does not filter out `wall-modules` even though it currently
 * has zero real products — the category itself is real and should stay
 * reachable (its page shows the honest "empty category" state).
 */
export function CategoryNav({
  locale,
  dictionary,
  active,
}: {
  locale: Locale;
  dictionary: Dictionary;
  active?: ShopCategory;
}) {
  return (
    <nav aria-label={dictionary.shop.categoryNavHeading}>
      <ul className="type-nav flex flex-wrap gap-x-(--space-sm) gap-y-(--space-2xs)">
        <li>
          <Link
            href={localeHref(locale, "/shop")}
            aria-current={active === undefined ? "page" : undefined}
            className={cn(
              "border-b-2 border-transparent pb-(--space-3xs) transition-colors duration-(--duration-fast)",
              active === undefined
                ? "border-text text-text"
                : "text-text-muted hover:text-text",
            )}
          >
            {dictionary.shop.allCategoriesHeading}
          </Link>
        </li>
        {shopCategories.map((category) => (
          <li key={category}>
            <Link
              href={localeHref(locale, `/shop/${category}`)}
              aria-current={active === category ? "page" : undefined}
              className={cn(
                "border-b-2 border-transparent pb-(--space-3xs) transition-colors duration-(--duration-fast)",
                active === category
                  ? "border-text text-text"
                  : "text-text-muted hover:text-text",
              )}
            >
              {shopCategoryLabel(category, dictionary)}
            </Link>
          </li>
        ))}
      </ul>
    </nav>
  );
}
