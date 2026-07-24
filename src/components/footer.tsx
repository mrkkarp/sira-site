import Link from "next/link";
import type { Locale } from "@/i18n/config";
import type { Dictionary } from "@/i18n/get-dictionary";
import { localeHref } from "@/lib/locale-href";
import { shopCategories } from "@/lib/schemas/product";

const infoLinks = [
  "paymentDelivery",
  "returns",
  "warranty",
  "care",
  "faq",
] as const;

const companyLinks = [
  "about",
  "designers",
  "resources",
  "stockists",
  "contact",
] as const;

const categoryLabelKey = {
  sinks: "sinks",
  planters: "planters",
  tables: "tables",
  "wall-modules": "wallModules",
  "wall-panels": "wallPanels",
  "wall-art": "wallArt",
  outdoor: "outdoor",
} as const;

const categoryPath: Record<(typeof shopCategories)[number], string> = {
  sinks: "/shop/sinks",
  planters: "/shop/planters",
  tables: "/shop/tables",
  "wall-modules": "/shop/wall-modules",
  "wall-panels": "/shop/wall-panels",
  "wall-art": "/shop/wall-art",
  outdoor: "/shop/outdoor",
};

const infoPath: Record<(typeof infoLinks)[number], string> = {
  paymentDelivery: "/payment-delivery",
  returns: "/returns",
  warranty: "/warranty",
  care: "/care",
  faq: "/faq",
};

const companyPath: Record<(typeof companyLinks)[number], string> = {
  about: "/about",
  designers: "/designers",
  resources: "/resources",
  stockists: "/stockists",
  contact: "/contact",
};

/** Dark "production mode" section per BRAND_VISUAL_GUIDE §2.4 — graphite bg, warm-light text. */
export function Footer({
  locale,
  dictionary,
}: {
  locale: Locale;
  dictionary: Dictionary;
}) {
  return (
    <footer className="bg-footer text-background border-t border-white/10">
      <div className="mx-auto grid max-w-7xl grid-cols-2 gap-10 px-6 py-16 md:grid-cols-4">
        <div className="col-span-2 md:col-span-1">
          <p className="type-h4 text-background font-serif">
            {dictionary.site.name}
          </p>
          <p className="type-body-sm text-background/60 mt-3 max-w-xs">
            {dictionary.site.tagline}
          </p>
        </div>

        <div>
          <h2 className="type-technical-label text-background/60">
            {dictionary.footer.shopHeading}
          </h2>
          <ul className="type-body-sm mt-4 flex flex-col gap-3">
            {shopCategories.map((category) => (
              <li key={category}>
                <Link
                  href={localeHref(locale, categoryPath[category])}
                  className="text-background/85 hover:text-background transition-colors duration-(--duration-fast)"
                >
                  {dictionary.shopCategories[categoryLabelKey[category]]}
                </Link>
              </li>
            ))}
          </ul>
        </div>

        <div>
          <h2 className="type-technical-label text-background/60">
            {dictionary.footer.infoHeading}
          </h2>
          <ul className="type-body-sm mt-4 flex flex-col gap-3">
            {infoLinks.map((key) => (
              <li key={key}>
                <Link
                  href={localeHref(locale, infoPath[key])}
                  className="text-background/85 hover:text-background transition-colors duration-(--duration-fast)"
                >
                  {dictionary.footerLinks[key]}
                </Link>
              </li>
            ))}
          </ul>
        </div>

        <div>
          <h2 className="type-technical-label text-background/60">
            {dictionary.footer.companyHeading}
          </h2>
          <ul className="type-body-sm mt-4 flex flex-col gap-3">
            {companyLinks.map((key) => (
              <li key={key}>
                <Link
                  href={localeHref(locale, companyPath[key])}
                  className="text-background/85 hover:text-background transition-colors duration-(--duration-fast)"
                >
                  {dictionary.footerLinks[key]}
                </Link>
              </li>
            ))}
          </ul>
        </div>
      </div>

      <div className="border-t border-white/10 px-6 py-6">
        <p className="type-caption text-background/50 mx-auto max-w-7xl">
          © {new Date().getFullYear()} {dictionary.site.name}.{" "}
          {dictionary.footer.copyright}
        </p>
      </div>
    </footer>
  );
}
