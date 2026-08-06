"use client";

import {
  useCallback,
  useEffect,
  useLayoutEffect,
  useRef,
  useState,
  useSyncExternalStore,
} from "react";
import dynamic from "next/dynamic";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { locales, type Locale } from "@/i18n/config";
import type { Dictionary } from "@/i18n/get-dictionary";
import { localeHref, stripLocaleFromPathname } from "@/lib/locale-href";
import { cn } from "@/lib/cn";
import { primaryNav } from "@/config/navigation";
import { Logo } from "@/components/logo";
import { LocaleSwitcher } from "@/components/locale-switcher";
import {
  getHeroBoundary,
  getHeroBoundaryServerSnapshot,
  subscribeHeroBoundary,
} from "@/components/header/hero-boundary";
import { CatalogMenuContent } from "@/components/header/catalog-menu-content";
import { CartButton } from "@/components/header/cart-button";
import { RollingLabel } from "@/components/header/rolling-label";

// Every page renders `Header`, so these three are code-split out of its main
// client bundle rather than statically imported. `MegaMenu` keeps its default
// SSR — its trigger button *is* the always-visible primary-nav label
// ("Каталог"), which must be in the server-rendered HTML. `SearchDrawer` and
// `MobileMenu` render `null` while closed (true on first paint), so `ssr:
// false` costs nothing and skips markup no one can see yet.
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

/** Scroll distance after which the bar stops reading as part of the page and
 *  starts reading as a plane floating over it. Deliberately short — the state
 *  change should land on the first deliberate scroll, not halfway down. */
const DETACH_AT = 24;

/**
 * The floating navigation bar.
 *
 * ## Geometry, and why nothing about it moves vertically
 *
 * The outer stack is `position: sticky`, not `fixed` (BRAND_VISUAL_GUIDE §12 —
 * sticky sidesteps iOS Safari's fixed-position quirks and still occupies its
 * own space in normal flow, so ordinary pages need no compensating padding).
 * Inside it, the bar is inset on all four sides by a constant gutter, which is
 * what produces the floating-plane look without giving up sticky's mechanics.
 *
 * That gutter, the bar's height and its border box are **fixed**. They have
 * to be: the stack's measured height is published as `--header-stack-height`
 * and consumed by hero sections' negative-margin trick and by two sticky
 * sidebars. Anything that changed the stack's height on scroll would move
 * every one of them — the definition of layout shift. So the scrolled state
 * is expressed entirely in paint: the bar gains its full border box and a
 * lighter surface, and the hairlines between cells gain contrast. The border
 * is always 1px on all four sides and only its *colour* changes, so even that
 * costs no reflow.
 *
 * For the same reason there is no hide-on-scroll. The reference navigation
 * never hides either, and the brief is explicit that navigation must not
 * disappear unpredictably.
 *
 * ## Closing overlays
 *
 * Three independent guarantees, because one is not enough:
 *
 *  1. `pathname` change — covers internal links, the logo, category and
 *     product selections, and browser Back/Forward between different paths.
 *  2. `popstate` — covers Back/Forward between two URLs that differ only by
 *     query string (`/rakovyny` → `/rakovyny?tap-hole=none`), which
 *     leaves `pathname` untouched and would otherwise slip through (1).
 *     Listening for the event avoids pulling `useSearchParams()` into the
 *     header, which would push the whole tree behind a Suspense boundary.
 *  3. Each overlay closes itself on link activation, Escape and outside
 *     pointerdown, so the panel is gone before the route even commits.
 *
 * Closing flows through the same three `useState`s in every case, so every
 * overlay's own cleanup runs too: scroll-lock release, backdrop fade,
 * `aria-expanded` → false, `inert` restored, focus returned to the trigger.
 */
export function Header({
  locale,
  dictionary,
}: {
  locale: Locale;
  dictionary: Dictionary;
}) {
  const stackRef = useRef<HTMLElement>(null);
  const pathname = usePathname();

  const [openMenu, setOpenMenu] = useState<string | null>(null);
  const [searchOpen, setSearchOpen] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const [detached, setDetached] = useState(false);
  const [overHero, setOverHero] = useState(false);

  const anyOverlayOpen = Boolean(openMenu) || searchOpen || mobileOpen;

  const closeAll = useCallback(() => {
    setOpenMenu(null);
    setSearchOpen(false);
    setMobileOpen(false);
  }, []);

  // (1) Route-change catch-all. Skips the very first run so it never fights
  // the initial (already-closed) state or flashes on first paint.
  const isInitialPath = useRef(true);
  useEffect(() => {
    if (isInitialPath.current) {
      isInitialPath.current = false;
      return;
    }
    closeAll();
  }, [pathname, closeAll]);

  // (2) Back/Forward that only changes the query string.
  useEffect(() => {
    window.addEventListener("popstate", closeAll);
    return () => window.removeEventListener("popstate", closeAll);
  }, [closeAll]);

  // Publish the stack's real height so hero sections and the two sticky
  // sidebars can offset by it. Belt-and-suspenders: a direct measurement on
  // mount/resize (in case ResizeObserver's initial callback is delayed or
  // throttled by the host) plus the observer for content-driven changes a
  // resize event alone wouldn't catch (font swap, etc.).
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

  // Detached-on-scroll. Passive listener, rAF-throttled, and it only ever
  // *writes* a boolean — it never reads layout, so there is nothing here to
  // thrash. React bails out of the re-render when the boolean is unchanged,
  // which is almost every frame.
  useEffect(() => {
    let ticking = false;

    function update() {
      ticking = false;
      setDetached(window.scrollY > DETACH_AT);
    }

    function onScroll() {
      if (ticking) return;
      ticking = true;
      requestAnimationFrame(update);
    }

    update();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  // Transparent-over-hero. The hero sentinel publishes itself on mount and
  // unmount (see `hero-boundary.tsx` for why the header must not go looking
  // for it), so this re-runs exactly when a hero appears or disappears —
  // never on a guess about when the incoming route's content has landed.
  const heroBoundary = useSyncExternalStore(
    subscribeHeroBoundary,
    getHeroBoundary,
    getHeroBoundaryServerSnapshot,
  );

  // A *layout* effect, deliberately. `overHero` can only be read from the DOM,
  // so the server-rendered markup always starts un-inverted. Correcting that
  // in a passive effect meant the homepage painted one frame of the opaque
  // light bar and then visibly cross-faded it to the inverted treatment over
  // `--duration-reveal` — motion announcing a state that was true all along.
  // Landing it before paint means the bar simply starts out right, and the
  // transition is reserved for the one change that is real: scrolling past
  // the hero's bottom edge.
  useLayoutEffect(() => {
    // No hero on this route: nothing to observe, and nothing to reset either —
    // `inverted` below already requires a live sentinel, so a stale `true`
    // from the previous route cannot leak through.
    if (!heroBoundary) return;

    // The stack is sticky at the top, so it keeps covering the hero until the
    // hero's bottom edge scrolls under it. Offset the observer's root by the
    // stack height so the inverted ink flips back the instant the bar stops
    // sitting over the dark hero — otherwise light text lingers over the
    // light content below and goes invisible.
    const measured = stackRef.current?.getBoundingClientRect().height;
    const cssVar = parseFloat(
      getComputedStyle(document.documentElement).getPropertyValue(
        "--header-stack-height",
      ),
    );
    const headerH = Math.ceil(
      measured ?? (Number.isFinite(cssVar) ? cssVar : 0),
    );

    // The question is only ever "is the hero's bottom edge still below the
    // bar?", so that is the whole predicate. Two tempting variants are both
    // wrong here, and each one silently fails on the most ordinary hero there
    // is — a full-viewport `h-svh` one, whose sentinel lands *exactly* on the
    // fold:
    //
    //  - Bounding the check above by `rect.top < innerHeight` reads a sentinel
    //    at `top === innerHeight` as "not over the hero" (744 < 744 is false),
    //    and would also mis-report any hero taller than the viewport, where
    //    the sentinel legitimately starts below the fold.
    //  - `entry.isIntersecting` fails the same case for the same reason: a 1px
    //    sentinel flush against the root's bottom edge intersects it over zero
    //    area, and `threshold: 0` means *ratio greater than zero*.
    //
    // Reading `boundingClientRect.top` off the entry instead makes the
    // callback agree with the initial measurement by construction, and the
    // shrunken root is still what schedules the callback at the moment the
    // edge passes under the bar.
    const isOver = (top: number) => top > headerH;

    setOverHero(isOver(heroBoundary.getBoundingClientRect().top));

    const observer = new IntersectionObserver(
      ([entry]) => setOverHero(isOver(entry.boundingClientRect.top)),
      { rootMargin: `-${headerH}px 0px 0px 0px`, threshold: 0 },
    );
    observer.observe(heroBoundary);
    return () => observer.disconnect();
  }, [heroBoundary]);

  // An open overlay always wins: the panel behind it needs a solid, legible
  // bar, not the inverted hero treatment. Requiring a live `heroBoundary` (and
  // not just the last measured `overHero`) is what makes leaving a hero page
  // instant — the sentinel unmounts, so the light ink cannot linger over the
  // incoming light page waiting for an observer callback.
  const inverted = Boolean(heroBoundary) && overHero && !anyOverlayOpen;

  // Hairline rules between cells. Over a dark hero `--color-border` (a light
  // warm taupe) is invisible against the photo, so the rules follow the
  // inverted ink instead, at low alpha so they read as dividers, not a table.
  const cellRule = inverted ? "border-current/30" : "border-border";
  // Inverted fill for the current page / open menu. It has to flip with the
  // bar: over a dark hero the "ink" is the light colour, so filling with
  // `--color-text` there would be invisible.
  const cellActive = inverted
    ? "bg-background text-text"
    : "bg-text text-background";
  const cellIdle = inverted ? "hover:bg-background/15" : "hover:bg-text/5";
  const navCell =
    "type-nav relative flex h-full items-center justify-center px-(--space-md) text-center uppercase tracking-[0.06em] whitespace-nowrap transition-colors duration-(--duration-normal) ease-(--ease-nav)";
  const utilityCell =
    "group relative flex h-full w-14 items-center justify-center transition-colors duration-(--duration-normal) ease-(--ease-nav)";

  // A nav cell is "current" for its own page and anything nested under it, plus
  // any prefix its config claims in `alsoCurrentFor` — which is how Каталог
  // stays lit on `/rakovyny`, a sibling of `/shop` rather than a descendant of
  // it. An open mega-menu lights its own cell too, which is why this is OR-ed
  // with `openMenu` at each call site.
  //
  // Compare on the BARE path, never on `localeHref(locale, href)`. uk is
  // unprefixed in the address bar, but `src/proxy.ts` rewrites `/projects` to
  // `/uk/projects` — so on a statically prerendered page `usePathname()`
  // returns the prefixed form during SSR and the unprefixed form after
  // hydration. Matching against the built href therefore missed every uk page
  // in the server HTML. Stripping the prefix makes both forms agree.
  const barePath = stripLocaleFromPathname(pathname, locales);
  function isCurrent(item: { href: string; alsoCurrentFor?: string[] }) {
    return [item.href, ...(item.alsoCurrentFor ?? [])].some(
      (href) => barePath === href || barePath.startsWith(`${href}/`),
    );
  }

  // The bar is two clusters, not one row with a hole in it. Mega-menu items
  // lead, hard against the wordmark; plain links trail, next to the utilities.
  // Splitting on `mega` rather than slicing at a fixed index keeps the rule
  // declarative — a second mega-menu would join the leading cluster on its
  // own, and an all-plain nav degrades to "everything right" without a guard.
  const leadNav = primaryNav.filter((item) => item.mega);
  const trailNav = primaryNav.filter((item) => !item.mega);

  // `isLead` suppresses a cell's left-hand rule. The logo cell already draws a
  // `border-r`, so the first cell after it must not draw its own: two abutting
  // hairlines paint as one 2px line, which reads as a mistake next to every
  // other 1px divider in the bar.
  function renderNavItem(item: (typeof primaryNav)[number], isLead: boolean) {
    const label = dictionary.nav[item.key as keyof typeof dictionary.nav];
    // Two different questions that happen to share a colour. `current` is
    // "which section is this page in" and is what assistive tech is told;
    // `active` adds "…or this menu is open", which is purely a paint state.
    const current = isCurrent(item);
    const active = current || openMenu === item.mega;
    const rule = isLead ? undefined : cn("border-l", cellRule);

    return item.mega ? (
      <MegaMenu
        key={item.key}
        menuKey={item.mega}
        openKey={openMenu}
        onOpenChange={setOpenMenu}
        label={label}
        current={current}
        className={rule}
        triggerClassName={cn(navCell, active ? cellActive : cellIdle)}
        panelClassName="inset-x-(--space-2xs)"
      >
        <CatalogMenuContent
          locale={locale}
          dictionary={dictionary}
          open={openMenu === item.mega}
        />
      </MegaMenu>
    ) : (
      <Link
        key={item.key}
        href={localeHref(locale, item.href)}
        aria-current={current ? "page" : undefined}
        className={cn(navCell, "group", rule, active ? cellActive : cellIdle)}
      >
        <RollingLabel>{label}</RollingLabel>
      </Link>
    );
  }

  return (
    <>
      {/* A real `<header>`, so the bar is the document's `banner` landmark.
          It was a bare `<div>`: the page exposed `main`, `contentinfo` and
          several `navigation` landmarks but no banner, which costs screen-
          reader users the one shortcut that jumps straight to site-wide
          navigation. The element carries no styles of its own, so swapping the
          tag changes nothing about layout — including the measured height
          published as `--header-stack-height` below. */}
      <header ref={stackRef} className="sticky top-0 z-40 p-(--space-2xs)">
        <div
          className={cn(
            // Border width is constant on all four sides; only the colour
            // changes between states, so the bar's box never resizes.
            "border transition-colors duration-(--duration-reveal) ease-(--ease-nav)",
            inverted
              ? "text-background border-x-transparent border-t-transparent border-b-current/30 bg-transparent"
              : detached
                ? "bg-surface text-text border-border-strong"
                : "bg-background text-text border-b-border border-x-transparent border-t-transparent",
          )}
        >
          <div className="mx-auto flex h-14 max-w-[100rem] items-stretch">
            <div
              className={cn(
                "flex items-center border-r pr-(--space-md) pl-(--space-sm)",
                cellRule,
              )}
            >
              <Logo locale={locale} inverted={inverted} />
            </div>

            {/* One `<nav>`, two clusters. The free width sits *between* them
                rather than in a single slab against the wordmark, which is
                what produced the ~540px void between ODUDLAB and Каталог. */}
            <nav
              aria-label={dictionary.header.menu}
              className="hidden lg:flex lg:flex-1 lg:items-stretch"
            >
              {leadNav.map((item, index) => renderNavItem(item, index === 0))}
              <div className="flex-1" />
              {trailNav.map((item) => renderNavItem(item, false))}
            </nav>

            {/* The nav is `display: none` below `lg`, so it cannot carry the
                spacer there. This one keeps the utilities hard right on the
                breakpoints where the nav has collapsed into the burger. */}
            <div className="flex-1 lg:hidden" />

            <div className={cn("flex items-stretch border-l", cellRule)}>
              <button
                type="button"
                aria-label={dictionary.search.openLabel}
                aria-expanded={searchOpen}
                onClick={() => setSearchOpen((value) => !value)}
                className={cn(utilityCell, searchOpen ? cellActive : cellIdle)}
              >
                {/* Search ⇄ close. Both icons live in one box and swap with a
                    counter-rotation, so the control reads as one object
                    changing state rather than two icons trading places. */}
                <span className="relative block h-5 w-5">
                  <svg
                    aria-hidden="true"
                    viewBox="0 0 24 24"
                    className={cn(
                      "absolute inset-0 h-5 w-5 transition-[opacity,transform] duration-(--duration-normal) ease-(--ease-nav)",
                      searchOpen
                        ? "scale-75 rotate-90 opacity-0"
                        : "scale-100 rotate-0 opacity-100",
                    )}
                  >
                    <circle
                      cx="11"
                      cy="11"
                      r="7"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="1.75"
                    />
                    <line
                      x1="21"
                      y1="21"
                      x2="16.65"
                      y2="16.65"
                      stroke="currentColor"
                      strokeWidth="1.75"
                    />
                  </svg>
                  <svg
                    aria-hidden="true"
                    viewBox="0 0 24 24"
                    className={cn(
                      "absolute inset-0 h-5 w-5 transition-[opacity,transform] duration-(--duration-normal) ease-(--ease-nav)",
                      searchOpen
                        ? "scale-100 rotate-0 opacity-100"
                        : "scale-75 -rotate-90 opacity-0",
                    )}
                  >
                    <path
                      d="M6 6l12 12M18 6L6 18"
                      stroke="currentColor"
                      strokeWidth="1.75"
                    />
                  </svg>
                </span>
              </button>

              <div
                className={cn(
                  "hidden items-center border-l px-(--space-sm) lg:flex",
                  cellRule,
                )}
              >
                <LocaleSwitcher locale={locale} inverted={inverted} />
              </div>

              <div className={cn("flex items-stretch border-l", cellRule)}>
                <CartButton
                  locale={locale}
                  label={dictionary.header.cart}
                  className={cn(utilityCell, cellIdle)}
                />
              </div>

              <button
                type="button"
                aria-label={dictionary.mobileMenu.openLabel}
                aria-expanded={mobileOpen}
                onClick={() => setMobileOpen(true)}
                className={cn(
                  utilityCell,
                  "border-l lg:hidden",
                  cellRule,
                  cellIdle,
                )}
              >
                {/* Three rules that redistribute on hover/press rather than
                    fading — the same "geometry moves, ink doesn't dim" rule
                    the rest of the bar follows. */}
                <span aria-hidden="true" className="flex w-5 flex-col gap-1.5">
                  <span className="block h-px w-full bg-current transition-transform duration-(--duration-normal) ease-(--ease-nav) group-hover:translate-x-0.5" />
                  <span className="block h-px w-full origin-right bg-current transition-transform duration-(--duration-normal) ease-(--ease-nav) group-hover:scale-x-75" />
                  <span className="block h-px w-full bg-current transition-transform duration-(--duration-normal) ease-(--ease-nav) group-hover:translate-x-0.5" />
                </span>
              </button>
            </div>
          </div>
        </div>
      </header>

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
