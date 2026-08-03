"use client";

import type { MouseEvent } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { locales, localeLabels, type Locale } from "@/i18n/config";
import { localeHref, stripLocaleFromPathname } from "@/lib/locale-href";
import { cn } from "@/lib/cn";

type Props = {
  locale: Locale;
  inverted?: boolean;
};

/**
 * UK / EN / PL as three peers: the current one carries a permanent rule
 * beneath it, the others draw that same rule on hover. The rule *is* the
 * state — an inactive locale is distinguished by a colour step, never by being
 * faded out, so it reads identically over the light bar and over a dark hero.
 * (The previous version used `opacity-60 → 100`, which disappears entirely on
 * a photographic background.)
 *
 * `inverted` is the over-hero case: there is no fixed "muted" ink to step down
 * to there, because the bar's ink is whatever contrasts with the photo behind
 * it, so the inactive state is derived from `currentColor` instead.
 *
 * ## Why the query string is read on click, not on render
 *
 * The switcher used to build its hrefs from `usePathname()` alone, so it
 * dropped the query: filtering the catalogue down to something and then
 * switching language threw the whole selection away and dumped the visitor on
 * a bare `/shop`. Same for `/search?q=…`, which landed on an empty search
 * page.
 *
 * The obvious fix — `useSearchParams()` — is the wrong tool *here*, for two
 * reasons.
 *
 * 1. It opts the client tree up to the nearest Suspense boundary out of
 *    prerendering. This component sits in the root layout's header *and*
 *    footer, so without a boundary it would take every route with it;
 *    `header.tsx` avoids the hook for precisely this reason. Wrapping it in a
 *    local `<Suspense>` was tried and measured: in a production build the
 *    boundary's resolved content stayed parked in React's hidden streaming
 *    staging `<div hidden id="S:0">` and never swapped in, so the visible
 *    links kept the query-less fallback hrefs. Inert code plus a real
 *    prerendering hazard.
 * 2. Even when it works, a render-time read can go stale relative to the DOM.
 *    `window.location.search` at the moment of the click cannot.
 *
 * So the href stays query-less — which is the right thing to *serve* anyway:
 * it prerenders, it is what a crawler and a "copy link address" should see,
 * and it is a valid page on its own. The query is appended at click time.
 *
 * Modifier clicks (⌘/Ctrl/Shift/Alt) and non-primary buttons are left alone
 * so "open in new tab" keeps working; those get the plain href, which is a
 * reasonable destination rather than a broken one.
 */
export function LocaleSwitcher({ locale, inverted = false }: Props) {
  const router = useRouter();
  const pathname = usePathname();
  const bare = stripLocaleFromPathname(pathname, locales);

  function keepQuery(event: MouseEvent<HTMLAnchorElement>, href: string) {
    if (
      event.defaultPrevented ||
      event.button !== 0 ||
      event.metaKey ||
      event.ctrlKey ||
      event.shiftKey ||
      event.altKey
    ) {
      return;
    }
    const search = window.location.search;
    if (!search) return;
    event.preventDefault();
    router.push(`${href}${search}`);
  }

  return (
    <ul className="type-label flex items-center">
      {locales.map((candidate) => {
        const isCurrent = candidate === locale;
        const href = localeHref(candidate, bare);
        return (
          <li key={candidate}>
            {/* `size-11` is the 44px minimum target (WCAG 2.5.5). A two-letter
                code padded to its text width measured 33×26, which is the sort
                of control that is technically hittable and practically not.
                The box grows; the type does not move, because it stays
                centred. The rule then has to hang off an inner span — anchored
                to the 44px box it would draw itself well below the letters. */}
            <Link
              href={href}
              onClick={(event) => keepQuery(event, href)}
              aria-current={isCurrent ? "true" : undefined}
              title={localeLabels[candidate]}
              className={cn(
                "group flex size-11 items-center justify-center uppercase transition-colors duration-(--duration-normal) ease-(--ease-nav)",
                isCurrent
                  ? "text-current"
                  : inverted
                    ? "text-current/55 hover:text-current"
                    : "text-text-muted hover:text-text",
              )}
            >
              <span className="relative">
                {candidate}
                <span
                  aria-hidden="true"
                  className={cn(
                    "absolute inset-x-0 -bottom-(--space-3xs) h-px origin-left bg-current transition-transform duration-(--duration-normal) ease-(--ease-nav)",
                    isCurrent
                      ? "scale-x-100"
                      : "scale-x-0 group-hover:scale-x-100 group-focus-visible:scale-x-100",
                  )}
                />
              </span>
            </Link>
          </li>
        );
      })}
    </ul>
  );
}
