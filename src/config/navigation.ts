/**
 * Structural nav config — hrefs and dictionary key references only, no
 * copy. Labels are pulled from the `catalogNav`/`nav` dictionaries so every
 * item stays translatable.
 */

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
 * The previous version of this file also linked `?tap-hole=`, `?size=`,
 * `?basins=` and `?shape=` — filters the parser silently ignores, so those
 * links quietly showed the *unfiltered* category. They are gone rather than
 * re-labelled: a menu entry that doesn't do what it says is worse than no
 * entry.
 *
 * `/shop/wall-modules` ("Бетонні модулі") has no products yet and renders
 * the category's honest empty state. It is listed deliberately — it is a
 * real route and a real part of the range, not a placeholder.
 */
export type CatalogNode = NavLink & { children?: NavLink[] };

export const catalogTree: CatalogNode[] = [
  {
    labelKey: "sinks",
    href: "/shop/sinks",
    children: [
      { labelKey: "sinksFreestanding", href: "/shop/sinks?mount=freestanding" },
      { labelKey: "sinksCountertop", href: "/shop/sinks?mount=countertop" },
    ],
  },
  {
    labelKey: "planters",
    href: "/shop/planters",
    children: [
      { labelKey: "plantersOutdoor", href: "/shop/planters?placement=outdoor" },
      { labelKey: "plantersIndoor", href: "/shop/planters?placement=indoor" },
    ],
  },
  { labelKey: "tables", href: "/shop/tables" },
  { labelKey: "outdoorFurniture", href: "/shop/outdoor" },
  { labelKey: "panels", href: "/shop/wall-panels" },
  { labelKey: "modules", href: "/shop/wall-modules" },
  { labelKey: "wallArt", href: "/shop/wall-art" },
  { labelKey: "custom", href: "/contact" },
];

export type MegaMenuKey = "catalog";

type PrimaryNavItem = { key: string; href: string; mega?: MegaMenuKey };

/**
 * Top-level header nav — `mega` names a mega-menu; omit for a plain link.
 *
 * Four items, at the owner's request: Каталог / Проєкти / Про нас /
 * Дизайнерам. `/contact` is the item that gave way to `/designers`; it is
 * not orphaned — it is the mega-menu's "Індивідуальні вироби" destination,
 * it is in `footerCustomerLinks`, `footerBrandLinks` and
 * `footerDesignerLinks`, and the mobile menu links it directly.
 *
 * Likewise `/care`, `/warranty` and `/faq` lost the "Бренд" mega-menu they
 * used to hang off; all three are in `footerCustomerLinks`. `/collections`
 * and `/colours` remain in `footerCatalogLinks`. Check that coverage before
 * removing anything else from here.
 */
export const primaryNav: PrimaryNavItem[] = [
  { key: "shop", href: "/shop", mega: "catalog" },
  { key: "projects", href: "/projects" },
  { key: "about", href: "/about" },
  { key: "designers", href: "/designers" },
];
