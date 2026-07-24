import Link from "next/link";
import type { Locale } from "@/i18n/config";
import type { Dictionary } from "@/i18n/get-dictionary";
import { localeHref } from "@/lib/locale-href";
import { shopCategories } from "@/lib/schemas/product";
import { Logo } from "@/components/logo";
import { LocaleSwitcher } from "@/components/locale-switcher";
import { MobileNav } from "@/components/mobile-nav";

const primaryNav = ["shop", "colours", "projects", "about", "contact"] as const;

export function Header({
  locale,
  dictionary,
}: {
  locale: Locale;
  dictionary: Dictionary;
}) {
  const navLabel = (key: (typeof primaryNav)[number]) => dictionary.nav[key];
  const navHref = (key: (typeof primaryNav)[number]) =>
    localeHref(locale, key === "shop" ? "/shop" : `/${key}`);

  return (
    <header className="border-border bg-background relative border-b">
      <div className="mx-auto flex h-20 max-w-7xl items-center justify-between px-6">
        <Logo locale={locale} />

        <nav aria-label={dictionary.header.menu} className="hidden md:block">
          <ul className="type-nav flex items-center gap-8">
            {primaryNav.map((key) => (
              <li
                key={key}
                className={key === "shop" ? "group relative" : undefined}
              >
                <Link
                  href={navHref(key)}
                  className="text-text hover:text-text-muted transition-colors duration-(--duration-fast)"
                >
                  {navLabel(key)}
                </Link>
                {key === "shop" ? (
                  <div className="border-border bg-surface invisible absolute top-full left-1/2 z-20 w-max -translate-x-1/2 border p-6 opacity-0 transition-opacity duration-(--duration-normal) ease-(--ease-standard) group-focus-within:visible group-focus-within:opacity-100 group-hover:visible group-hover:opacity-100">
                    <ul className="type-nav grid grid-cols-2 gap-x-10 gap-y-3">
                      {shopCategories.map((category) => (
                        <li key={category}>
                          <Link
                            href={localeHref(locale, `/shop/${category}`)}
                            className="text-text-muted hover:text-text transition-colors duration-(--duration-fast)"
                          >
                            {dictionary.shopCategories[toCamel(category)]}
                          </Link>
                        </li>
                      ))}
                    </ul>
                  </div>
                ) : null}
              </li>
            ))}
          </ul>
        </nav>

        <div className="flex items-center gap-5">
          <LocaleSwitcher locale={locale} />
          <Link
            href={localeHref(locale, "/search")}
            className="type-nav text-text-muted hover:text-text hidden transition-colors duration-(--duration-fast) sm:inline"
          >
            {dictionary.header.searchPlaceholder}
          </Link>
          <Link
            href={localeHref(locale, "/cart")}
            className="type-nav text-text-muted hover:text-text transition-colors duration-(--duration-fast)"
          >
            {dictionary.header.cart}
          </Link>
          <MobileNav label={dictionary.header.menu}>
            <ul className="type-body-lg flex flex-col gap-4">
              {primaryNav.map((key) => (
                <li key={key}>
                  <Link href={navHref(key)} className="text-text">
                    {navLabel(key)}
                  </Link>
                </li>
              ))}
            </ul>
          </MobileNav>
        </div>
      </div>
    </header>
  );
}

function toCamel(
  value: string,
):
  | "sinks"
  | "planters"
  | "tables"
  | "wallModules"
  | "wallPanels"
  | "wallArt"
  | "outdoor" {
  const map = {
    sinks: "sinks",
    planters: "planters",
    tables: "tables",
    "wall-modules": "wallModules",
    "wall-panels": "wallPanels",
    "wall-art": "wallArt",
    outdoor: "outdoor",
  } as const;
  return map[value as keyof typeof map];
}
