import type { Locale } from "@/i18n/config";
import type { Dictionary } from "@/i18n/get-dictionary";
import type { ShopCategory, ShopSubcategory } from "@/lib/schemas/product";
import { shopCategoryPath } from "@/lib/schemas/product";
import { localeHref } from "@/lib/locale-href";
import { shopCategoryLabel } from "@/lib/shop-category-label";

export type ShopCrumbArgs = {
  locale: Locale;
  dictionary: Dictionary;
  category?: ShopCategory;
  subcategory?: ShopSubcategory;
  /** The current page's own heading — always the last crumb. Passed in
   * rather than recomputed so the trail can never disagree with the `h1`. */
  heading: string;
};

/**
 * One trail, three renderings. The visual `<Breadcrumbs>` leaves the current
 * page unlinked; `BreadcrumbList` JSON-LD wants a URL for every position
 * including the last; and the empty-category header renders its own copy.
 * Those three used to be three hand-written literals in three files, which is
 * how `/shop` ended up linked from the catalog's JSON-LD and unlinked from its
 * markup at the same time. Build the trail once, project it twice.
 */
function trail({
  locale,
  dictionary,
  category,
  subcategory,
  heading,
}: ShopCrumbArgs): { name: string; path: string }[] {
  const items = [
    { name: dictionary.shop.breadcrumbHome, path: localeHref(locale, "/") },
    { name: dictionary.shop.breadcrumbShop, path: localeHref(locale, "/shop") },
  ];

  if (category) {
    items.push({
      // On a subcategory page the parent crumb is the parent's own label, not
      // the heading — the heading belongs to the last crumb.
      name: subcategory ? shopCategoryLabel(category, dictionary) : heading,
      path: localeHref(locale, shopCategoryPath(category)),
    });
  }

  if (subcategory) {
    items.push({
      name: heading,
      path: localeHref(
        locale,
        shopCategoryPath(subcategory.category, subcategory.slug),
      ),
    });
  }

  return items;
}

/** `BreadcrumbList` JSON-LD input — every position keeps its path. */
export function buildShopBreadcrumbItems(args: ShopCrumbArgs) {
  return trail(args);
}

/** Visual `<Breadcrumbs>` input — the current page is plain text, not a link
 * to itself. */
export function buildShopCrumbs(args: ShopCrumbArgs) {
  const items = trail(args);
  return items.map((item, index) =>
    index === items.length - 1
      ? { label: item.name }
      : { label: item.name, href: item.path },
  );
}
