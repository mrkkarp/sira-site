/**
 * Structural nav config — hrefs and dictionary key references only, no
 * copy. Labels are pulled from the `catalogNav`/`nav` dictionaries so every
 * item stays translatable.
 */

import {
  shopCategories,
  shopCategoryPath,
} from "@/lib/schemas/product-categories";

export type NavLink = { labelKey: string; href: string };

/**
 * The catalogue tree the header's mega-menu renders, in display order.
 *
 * **Every href here resolves to real, data-backed content — nothing is
 * invented.** The two sub-lists are the only two splits the shop's filter
 * parser (`src/lib/shop-filters.ts`) actually implements, and both mirror a
 * real split in the source export (`src/lib/product-mapping.ts`):
 *
 *   "Раковини/Підлогові" -> sinks + mount=freestanding   (16 products)
 *   "Раковини/Накладні"  -> sinks + mount=countertop     (16 products)
 *   "Вазони/Вуличні"     -> planters + placement=outdoor  (6 products)
 *   "Вазони/До дому"     -> planters + placement=indoor  (12 products)
 *
 * Three of those four now have a *page* of their own rather than a query
 * string — `/rakovyny/pidlohovi`, `/rakovyny/nakladni`, `/vazony/vulychni`,
 * the three splits that were real URLs on the old site and are named in the
 * keyword map (see `shopSubcategories` in
 * `src/lib/schemas/product-categories.ts`). The menu links the page, not the
 * filter: same listing either way, but one of the two is indexable and gets
 * its own `h1`. "Вазони/До дому" has no page — no query targets it — so it
 * stays a plain filter link. The asymmetry is deliberate, not an oversight.
 *
 * Category hrefs come from `shopCategoryPath`, so this file cannot drift from
 * the addresses the routes actually serve.
 *
 * The previous version of this file also linked `?tap-hole=`, `?size=`,
 * `?basins=` and `?shape=` — filters the parser silently ignores, so those
 * links quietly showed the *unfiltered* category. They are gone rather than
 * re-labelled: a menu entry that doesn't do what it says is worse than no
 * entry.
 *
 * `/betonni-moduli-dlia-stiny` ("Бетонні модулі") has no products yet and
 * renders the category's honest empty state. It is listed deliberately — it
 * is a real route and a real part of the range, not a placeholder.
 */
export type CatalogNode = NavLink & { children?: NavLink[] };

export const catalogTree: CatalogNode[] = [
  {
    labelKey: "sinks",
    href: shopCategoryPath("sinks"),
    children: [
      {
        labelKey: "sinksFreestanding",
        href: shopCategoryPath("sinks", "pidlohovi"),
      },
      {
        labelKey: "sinksCountertop",
        href: shopCategoryPath("sinks", "nakladni"),
      },
    ],
  },
  {
    labelKey: "planters",
    href: shopCategoryPath("planters"),
    children: [
      {
        labelKey: "plantersOutdoor",
        href: shopCategoryPath("planters", "vulychni"),
      },
      {
        labelKey: "plantersIndoor",
        href: `${shopCategoryPath("planters")}?placement=indoor`,
      },
    ],
  },
  { labelKey: "tables", href: shopCategoryPath("tables") },
  { labelKey: "outdoorFurniture", href: shopCategoryPath("outdoor") },
  { labelKey: "panels", href: shopCategoryPath("wall-panels") },
  { labelKey: "modules", href: shopCategoryPath("wall-modules") },
  { labelKey: "wallArt", href: shopCategoryPath("wall-art") },
  { labelKey: "custom", href: "/contact" },
];

export type MegaMenuKey = "catalog" | "info";

type PrimaryNavItem = {
  key: string;
  href: string;
  mega?: MegaMenuKey;
  /**
   * Extra path prefixes that should also light this cell up, for sections whose
   * pages do not live under the item's own `href`.
   *
   * Only "Каталог" needs it, and only since the categories moved to the top
   * level. The header's rule is "current for my `href` and anything nested
   * under it", which used to cover the whole catalogue for free because every
   * category was `/shop/<something>`. Now they are `/rakovyny`, `/vazony`, …
   * — siblings of `/shop`, not descendants — so without this the header would
   * go blank on the five pages the live Google Ads campaign lands on. Listing
   * them here rather than special-casing the string "shop" in `header.tsx`
   * keeps the rule declarative and the header ignorant of the catalogue.
   */
  alsoCurrentFor?: string[];
};

/**
 * Top-level header nav — `mega` names a mega-menu; omit for a plain link.
 *
 * Four items, at the owner's request: Каталог / Проєкти / Про нас /
 * Контакти. `/designers` is the item that gave way to `/contact` (2026-08-11,
 * reversing the swap that ran the other way earlier): a visitor looking for a
 * phone number should not have to guess which of four abstractions hides it,
 * and the designers' page is a second-order destination by comparison.
 *
 * `/designers` is not orphaned by that — it heads the "Для дизайнерів" column
 * of `infoMenuGroups` below, so it is one hover from the same bar, and it is
 * still in `footerDesignerLinks`.
 *
 * Every item here needs a real `href`: `NoScriptNav` renders the whole array
 * as plain links, and the mobile menu renders every non-`mega` one. A cell
 * that is *only* a disclosure — the information menu — therefore cannot live
 * in this array; see `infoMenuGroups`.
 *
 * `/care`, `/warranty` and `/faq` lost the "Бренд" mega-menu they used to
 * hang off; all three are in `footerCustomerLinks` and now in `infoMenuGroups`
 * as well. `/collections` and `/colours` remain in `footerCatalogLinks`.
 * Check that coverage before removing anything else from here.
 */
export const primaryNav: PrimaryNavItem[] = [
  {
    key: "shop",
    href: "/shop",
    mega: "catalog",
    // Subcategories come along for free: `/rakovyny/nakladni` is nested under
    // `/rakovyny`, and the header already matches descendants.
    alsoCurrentFor: shopCategories.map((category) => shopCategoryPath(category)),
  },
  { key: "projects", href: "/projects" },
  { key: "about", href: "/about" },
  { key: "contact", href: "/contact" },
];

/**
 * One column of the header's information disclosure.
 *
 * `labels` names the dictionary sub-object this group's `labelKey`s resolve
 * against, the same convention `src/config/footer-nav.ts` documents in prose —
 * written down as data here because three columns pull from three different
 * namespaces and the component has to switch on it.
 */
export type InfoMenuGroup = {
  /** Column heading, always resolved against `dictionary.footerNav`. */
  headingKey: string;
  labels: "footerLinks" | "designers" | "footerNav";
  links: NavLink[];
};

/**
 * The information disclosure that sits to the right of Контакти on desktop —
 * the pages a buyer actually goes looking for, none of which earns a
 * top-level cell of its own.
 *
 * Nothing new was written for it: every href and every `labelKey` already
 * exists in `src/config/footer-nav.ts` and its dictionaries, so the menu and
 * the footer cannot drift apart into two different answers to "how much is
 * delivery". The three deliberate subtractions are all the same subtraction —
 * a link whose destination is already a cell in the same bar:
 *
 *   - `/contact` (footer's "Запит прорахунку" and "Контакти") — the cell
 *     immediately to the left of this trigger.
 *   - `/projects` (footer's brand column) — a cell two along.
 *   - `/about` itself (footer's "Історія") — the cell between them. The two
 *     *anchors* into it stay, because `#production` and `#materials` land
 *     somewhere the plain nav link does not.
 *
 * This is not `primaryNav`: the trigger is a disclosure with no page behind
 * it, and every entry in that array must resolve to a real link.
 */
export const infoMenuGroups: InfoMenuGroup[] = [
  {
    headingKey: "customersHeading",
    labels: "footerLinks",
    links: [
      { labelKey: "paymentDelivery", href: "/payment-delivery" },
      { labelKey: "returns", href: "/returns" },
      { labelKey: "care", href: "/care" },
      { labelKey: "warranty", href: "/warranty" },
      { labelKey: "faq", href: "/faq" },
      { labelKey: "orderStatus", href: "/order-status" },
    ],
  },
  {
    headingKey: "designersHeading",
    labels: "designers",
    links: [
      { labelKey: "terms", href: "/designers" },
      { labelKey: "samples", href: "/samples" },
      { labelKey: "catalogues", href: "/resources" },
      { labelKey: "models3d", href: "/resources#3d-models" },
      { labelKey: "drawings", href: "/resources#drawings" },
      { labelKey: "specifications", href: "/resources#specifications" },
    ],
  },
  {
    headingKey: "brandHeading",
    labels: "footerNav",
    links: [
      { labelKey: "production", href: "/about#production" },
      { labelKey: "materials", href: "/about#materials" },
      { labelKey: "careers", href: "/careers" },
    ],
  },
];

/**
 * The routes the information cell should light up on, derived rather than
 * retyped so a link added above cannot forget to bring its highlight with it.
 *
 * Two things are stripped, and both matter. The fragment, because
 * `/about#materials` is the page `/about`. And any path a `primaryNav` item
 * already claims — without that, standing on `/about` would light *two* cells
 * at once, and "which section am I in" is a question with one answer.
 */
export const infoMenuSectionPaths: string[] = [
  ...new Set(
    infoMenuGroups
      .flatMap((group) => group.links)
      .map((link) => link.href.split("#")[0]),
  ),
].filter((href) => !primaryNav.some((item) => item.href === href));
