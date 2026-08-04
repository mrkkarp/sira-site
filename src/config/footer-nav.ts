/**
 * Footer column structure — hrefs + dictionary key references only, no
 * copy (same convention as `src/config/navigation.ts`). Each array below
 * documents which dictionary sub-object its `labelKey`s resolve against,
 * since footer columns intentionally pull from different namespaces:
 *
 * - `footerCatalogLinks`   -> `dictionary.megaMenu.catalog`   (shared with the header mega-menu)
 * - `footerCustomerLinks`  -> `dictionary.footerLinks`        (existing info-page labels)
 * - `footerDesignerLinks`  -> `dictionary.megaMenu.designers` (exact 1:1 match, shared with header)
 * - `footerBrandLinks`     -> `dictionary.footerNav`          (new, dedicated column copy)
 * - `footerLegalLinks`     -> `dictionary.footerNav`          (new, dedicated column copy)
 *
 * "Юридичне" -> "Доставка і повернення" intentionally links to the existing
 * `/payment-delivery` page rather than duplicating that content elsewhere.
 * "Cookies" links to the standalone policy page, not the consent banner —
 * reopening the banner itself is a separate affordance (see cookie-consent.tsx).
 */
import type { NavLink } from "@/config/navigation";
import { shopCategoryPath } from "@/lib/schemas/product-categories";

export const footerCatalogLinks: NavLink[] = [
  { labelKey: "sinks", href: shopCategoryPath("sinks") },
  { labelKey: "planters", href: shopCategoryPath("planters") },
  { labelKey: "tables", href: shopCategoryPath("tables") },
  { labelKey: "wallPanels", href: shopCategoryPath("wall-panels") },
  { labelKey: "outdoor", href: shopCategoryPath("outdoor") },
  { labelKey: "custom", href: "/contact" },
  { labelKey: "samples", href: "/samples" },
  // `/collections` and `/colours` live here, and only here, on desktop: both
  // were dropped from `primaryNav` when the header was cut to four items, and
  // the mobile menu (which is hand-written, not driven by `primaryNav`) still
  // links them. Removing them from this column orphans both pages again.
  { labelKey: "collections", href: "/collections" },
  { labelKey: "colours", href: "/colours" },
  { labelKey: "allProducts", href: "/shop" },
];

export const footerCustomerLinks: NavLink[] = [
  { labelKey: "paymentDelivery", href: "/payment-delivery" },
  { labelKey: "returns", href: "/returns" },
  { labelKey: "care", href: "/care" },
  { labelKey: "warranty", href: "/warranty" },
  { labelKey: "faq", href: "/faq" },
  { labelKey: "contact", href: "/contact" },
  { labelKey: "orderStatus", href: "/order-status" },
];

export const footerDesignerLinks: NavLink[] = [
  { labelKey: "terms", href: "/designers" },
  { labelKey: "samples", href: "/samples" },
  { labelKey: "catalogues", href: "/resources" },
  { labelKey: "models3d", href: "/resources#3d-models" },
  { labelKey: "drawings", href: "/resources#drawings" },
  { labelKey: "specifications", href: "/resources#specifications" },
  { labelKey: "quoteRequest", href: "/contact" },
];

export const footerBrandLinks: NavLink[] = [
  { labelKey: "history", href: "/about" },
  { labelKey: "production", href: "/about#production" },
  { labelKey: "materials", href: "/about#materials" },
  { labelKey: "projects", href: "/projects" },
  { labelKey: "careers", href: "/careers" },
  { labelKey: "contact", href: "/contact" },
];

export const footerLegalLinks: NavLink[] = [
  { labelKey: "privacyPolicy", href: "/privacy-policy" },
  { labelKey: "termsOfUse", href: "/terms-of-use" },
  { labelKey: "deliveryReturns", href: "/payment-delivery" },
  { labelKey: "publicOffer", href: "/public-offer" },
  { labelKey: "cookiesPolicy", href: "/cookies-policy" },
];
