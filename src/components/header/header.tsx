"use client";

import { useEffect, useRef, useState } from "react";
import dynamic from "next/dynamic";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { locales, type Locale } from "@/i18n/config";
import type { Dictionary } from "@/i18n/get-dictionary";
import { localeHref, stripLocaleFromPathname } from "@/lib/locale-href";
import { cn } from "@/lib/cn";
import { primaryNav, brandMenu } from "@/config/navigation";
import { Logo } from "@/components/logo";
import { LocaleSwitcher } from "@/components/locale-switcher";
import { CatalogMenuContent } from "@/components/header/catalog-menu-content";
import { SimpleMenuContent } from "@/components/header/simple-menu-content";
import { CartButton } from "@/components/header/cart-button";

// Prompt 9 §5 (performance audit) — every page renders `Header`, so these
// three are code-split out of its main client bundle rather than statically
// imported. `MegaMenu` still needs its default SSR (its trigger button *is*
// the always-visible primary-nav label, e.g. "Каталог" — that must stay in
// the server-rendered HTML). `SearchDrawer`/`MobileMenu` render `null`
// whenever their `open` prop is false (true on first paint), so `ssr:
// false` costs nothing today and skips server-rendering markup no one can
// see yet.
const MegaMenu = dynamic(() =>
  import("@/components/header/mega-menu").then((mod) => mod.MegaMenu),
);
const SearchDrawer = dynamic(
  () =>
    import("@/components/header/search-drawer").then((mod) => mod.SearchDrawer),
  { ssr: false },
);
const MobileMenu = dynamic(
  () => import("@/components/header/mobile-menu").then((mod) => mod.MobileMenu),
  { ssr: false },
);

export function Header({
  locale,
  dictionary,
}: {
  locale: Locale;
  dictionary: Dictionary;
}) {
  const stackRef = useRef<HTMLDivElement>(null);
  const barRef = useRef<HTMLDivElement>(null);
  const pathname = usePathname();

  const [openMenu, setOpenMenu] = useState<string | null>(null);
  const [searchOpen, setSearchOpen] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const [hidden, setHidden] = useState(false);
  const [transparent, setTransparent] = useState(false);

  const anyOverlayOpen = Boolean(openMenu) || searchOpen || mobileOpen;

  // Close every overlay the moment the route changes. This is the catch-all
  // that guarantees no menu can survive a navigation: it covers internal-link
  // clicks inside the mega-menu / mobile drawer / search, the logo, a
  // category/product selection, AND browser Back/Forward — every one of which
  // changes `pathname`. (Escape and outside-click are still handled
  // per-overlay for the no-navigation case.) Setting all three closed also
  // triggers each overlay's own cleanup — body scroll-lock release, backdrop
  // removal, `aria-expanded` → false, focus restore — so nothing invisible is
  // left stacked over the page. Skips the very first run so it never fights
  // the initial (already-closed) state or flashes on first paint.
  const isInitialPath = useRef(true);
  useEffect(() => {
    if (isInitialPath.current) {
      isInitialPath.current = false;
      return;
    }
    setOpenMenu(null);
    setSearchOpen(false);
    setMobileOpen(false);
  }, [pathname]);

  // Measure the announcement bar + header bar together so the hero
  // negative-margin trick can offset by the real (responsive) height.
  // Belt-and-suspenders: a direct rect measurement on mount/resize (in case
  // ResizeObserver's own initial callback is delayed or throttled by the
  // host environment) plus the observer for content-driven changes
  // (font swap, announcement text wrapping, etc.) that a resize event alone
  // wouldn't catch.
  useEffect(() => {
    const node = stackRef.current;
    if (!node) return;

    function measure() {
      if (!node) return;
      document.documentElement.style.setProperty(
        "--header-stack-height",
        `${Math.round(node.getBoundingClientRect().height)}px`,
      );
    }

    measure();
    window.addEventListener("resize", measure);

    const observer = new ResizeObserver(measure);
    observer.observe(node);
    return () => {
      window.removeEventListener("resize", measure);
      observer.disconnect();
    };
  }, []);

  // Hide on scroll-down, show on scroll-up. Never hide near the top, while
  // an overlay is open, or while focus is inside the header.
  useEffect(() => {
    let lastY = window.scrollY;
    let ticking = false;

    function update() {
      ticking = false;
      const y = window.scrollY;
      if (anyOverlayOpen || y < 80) {
        setHidden(false);
      } else if (y > lastY) {
        setHidden(true);
      } else if (y < lastY) {
        setHidden(false);
      }
      lastY = y;
    }

    function onScroll() {
      if (ticking) return;
      ticking = true;
      requestAnimationFrame(update);
    }

    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, [anyOverlayOpen]);

  // Transparent-over-hero: watch the page's optional `#hero-boundary`
  // sentinel. Re-run on route change since it's page content, not layout.
  // Includes a direct rect check on mount (belt-and-suspenders alongside
  // the observer — see the height-measurement effect above for why).
  useEffect(() => {
    const sentinel = document.getElementById("hero-boundary");
    if (!sentinel) {
      const timeout = setTimeout(() => setTransparent(false), 0);
      return () => clearTimeout(timeout);
    }

    // The header stack is sticky at the top, so it keeps covering the hero
    // until the hero's bottom edge (`#hero-boundary`) scrolls *under* it.
    // Offset the observer's root by the header height so `transparent` (white
    // text) flips back to the solid header the instant the header stops
    // covering the dark hero. Without this, the light text lingers over the
    // light content directly below the hero and turns invisible — most
    // visibly when the auto-hidden header slides back in on scroll-up.
    const measured = stackRef.current?.getBoundingClientRect().height;
    const cssVar = parseFloat(
      getComputedStyle(document.documentElement).getPropertyValue(
        "--header-stack-height",
      ),
    );
    const headerH = Math.ceil(
      measured ?? (Number.isFinite(cssVar) ? cssVar : 0),
    );

    const timeout = setTimeout(() => {
      const rect = sentinel.getBoundingClientRect();
      setTransparent(rect.top > headerH && rect.top < window.innerHeight);
    }, 0);

    const observer = new IntersectionObserver(
      ([entry]) => setTransparent(entry.isIntersecting),
      { rootMargin: `-${headerH}px 0px 0px 0px`, threshold: 0 },
    );
    observer.observe(sentinel);
    return () => {
      clearTimeout(timeout);
      observer.disconnect();
    };
  }, [pathname]);

  const showTransparent = transparent && !anyOverlayOpen;

  // The bar is a row of cells separated by hairline rules. Over a dark hero
  // the bar has no background of its own, so the rules can't use
  // `--color-border` (a light warm taupe, invisible on the hero photo) —
  // they follow the inverted text colour instead, at low alpha so they read
  // as dividers rather than a table.
  const cellRule = showTransparent ? "border-current/30" : "border-border";
  // Inverted fill for the current page / open menu, mirroring the reference
  // header. It has to flip with the bar: over a dark hero the "ink" is the
  // light colour, so filling with `--color-text` there would be invisible.
  const cellActive = showTransparent
    ? "bg-background text-text"
    : "bg-text text-background";
  const cellIdle = showTransparent
    ? "hover:bg-background/15"
    : "hover:bg-text/5";
  const navCell =
    "type-nav flex h-full items-center justify-center px-(--space-md) text-center uppercase tracking-[0.06em] whitespace-nowrap transition-colors duration-(--duration-fast)";

  // A nav cell is "current" for its own page and anything nested under it, so
  // /shop/sinks keeps Каталог lit. An open mega-menu also lights its own
  // cell, which is why this is OR-ed with `openMenu` at each call site.
  //
  // Compare on the BARE path, never on `localeHref(locale, href)`. The uk
  // locale is unprefixed in the address bar, but `src/proxy.ts` rewrites
  // `/projects` to `/uk/projects` — so on a statically prerendered page
  // `usePathname()` returns the prefixed form during SSR and the unprefixed
  // form after hydration. Matching against the built href therefore missed
  // every uk page in the server HTML (and would have flipped the highlight on
  // hydration). Stripping the prefix makes both forms agree.
  const barePath = stripLocaleFromPathname(pathname, locales);
  function isCurrent(href: string) {
    return barePath === href || barePath.startsWith(`${href}/`);
  }

  return (
    <>
      <div ref={stackRef} className="sticky top-0 z-40">
        <div
          className={cn(
            "transition-transform duration-(--duration-normal) ease-(--ease-standard)",
            hidden && !anyOverlayOpen && "-translate-y-full",
          )}
        >
          <div
            ref={barRef}
            onFocusCapture={() => setHidden(false)}
            className={cn(
              "border-b transition-colors duration-(--duration-normal)",
              cellRule,
              showTransparent
                ? "text-background bg-transparent"
                : "bg-background text-text",
            )}
          >
            <div className="mx-auto flex h-16 max-w-7xl items-stretch px-6">
              <div
                className={cn(
                  "flex items-center gap-(--space-xs) border-r pr-(--space-md)",
                  cellRule,
                )}
              >
                <button
                  type="button"
                  aria-label={dictionary.mobileMenu.openLabel}
                  onClick={() => setMobileOpen(true)}
                  className="flex h-11 w-11 items-center justify-center lg:hidden"
                >
                  <svg
                    aria-hidden="true"
                    viewBox="0 0 24 24"
                    className="h-5 w-5"
                  >
                    <path
                      d="M3 6h18M3 12h18M3 18h18"
                      stroke="currentColor"
                      strokeWidth="2"
                    />
                  </svg>
                </button>
                <Logo locale={locale} />
              </div>

              <nav
                aria-label={dictionary.header.menu}
                className="hidden lg:flex lg:items-stretch"
              >
                {primaryNav.map((item) => {
                  const label =
                    dictionary.nav[item.key as keyof typeof dictionary.nav];
                  const active = isCurrent(item.href) || openMenu === item.mega;

                  return item.mega ? (
                    <MegaMenu
                      key={item.key}
                      menuKey={item.mega}
                      openKey={openMenu}
                      onOpenChange={setOpenMenu}
                      label={label}
                      width={item.mega === "catalog" ? "full" : "auto"}
                      className={cn("border-r", cellRule)}
                      triggerClassName={cn(
                        navCell,
                        active ? cellActive : cellIdle,
                      )}
                    >
                      {item.mega === "catalog" ? (
                        <CatalogMenuContent
                          locale={locale}
                          dictionary={dictionary}
                        />
                      ) : (
                        <SimpleMenuContent
                          locale={locale}
                          items={brandMenu}
                          labels={dictionary.megaMenu.brand}
                        />
                      )}
                    </MegaMenu>
                  ) : (
                    <Link
                      key={item.key}
                      href={localeHref(locale, item.href)}
                      aria-current={active ? "page" : undefined}
                      className={cn(
                        navCell,
                        "border-r",
                        cellRule,
                        active ? cellActive : cellIdle,
                      )}
                    >
                      {label}
                    </Link>
                  );
                })}
              </nav>

              <div className="flex-1" />

              <div className="flex items-stretch">
                <button
                  type="button"
                  aria-label={dictionary.search.openLabel}
                  onClick={() => setSearchOpen(true)}
                  className={cn(
                    "flex w-14 items-center justify-center border-l transition-colors duration-(--duration-fast)",
                    cellRule,
                    searchOpen ? cellActive : cellIdle,
                  )}
                >
                  <svg
                    aria-hidden="true"
                    viewBox="0 0 24 24"
                    className="h-5 w-5"
                  >
                    <circle
                      cx="11"
                      cy="11"
                      r="7"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="2"
                    />
                    <line
                      x1="21"
                      y1="21"
                      x2="16.65"
                      y2="16.65"
                      stroke="currentColor"
                      strokeWidth="2"
                    />
                  </svg>
                </button>
                <div
                  className={cn(
                    "hidden items-center border-l px-(--space-sm) lg:flex",
                    cellRule,
                  )}
                >
                  <LocaleSwitcher locale={locale} />
                </div>
                <div
                  className={cn(
                    "flex items-center justify-center border-l pl-(--space-3xs)",
                    cellRule,
                  )}
                >
                  <CartButton locale={locale} label={dictionary.header.cart} />
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      <SearchDrawer
        open={searchOpen}
        onClose={() => setSearchOpen(false)}
        locale={locale}
        dictionary={dictionary}
      />
      <MobileMenu
        open={mobileOpen}
        onClose={() => setMobileOpen(false)}
        locale={locale}
        dictionary={dictionary}
      />
    </>
  );
}
