"use client";

import type { MouseEvent } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { locales, localeLabels, type Locale } from "@/i18n/config";
import { localeHref, stripLocaleFromPathname } from "@/lib/locale-href";

/**
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
export function LocaleSwitcher({ locale }: { locale: Locale }) {
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
    <ul className="type-label flex items-center gap-2">
      {locales.map((candidate) => {
        const href = localeHref(candidate, bare);
        return (
          <li key={candidate}>
            <Link
              href={href}
              onClick={(event) => keepQuery(event, href)}
              aria-current={candidate === locale ? "true" : undefined}
              title={localeLabels[candidate]}
              className={
                candidate === locale
                  ? "font-medium"
                  : "opacity-60 transition-opacity duration-(--duration-fast) hover:opacity-100"
              }
            >
              {candidate}
            </Link>
          </li>
        );
      })}
    </ul>
  );
}
