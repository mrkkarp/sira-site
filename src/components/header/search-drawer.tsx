"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import type { Locale } from "@/i18n/config";
import type { Dictionary } from "@/i18n/get-dictionary";
import { localeHref } from "@/lib/locale-href";
import { formatTemplate } from "@/lib/format-template";
// The zod-free module, deliberately: this component is in the header, so it is
// on every page, and importing the same seven strings from `./product` would
// put zod's whole runtime into the shared client bundle.
import {
  shopCategories,
  shopCategoryPath,
} from "@/lib/schemas/product-categories";
import { shopCategoryLabel } from "@/lib/shop-category-label";
import { Price } from "@/components/ui/price";
import type { SearchResponse } from "@/app/api/search/route";
import { useDialogBehaviour } from "@/components/ui/use-dialog-behaviour";

const RECENT_SEARCHES_KEY = "odudlab:recent-searches";
const MAX_RECENT = 5;

function readRecentSearches(): string[] {
  try {
    const raw = localStorage.getItem(RECENT_SEARCHES_KEY);
    return raw ? (JSON.parse(raw) as string[]) : [];
  } catch {
    return [];
  }
}

function saveRecentSearch(query: string) {
  const existing = readRecentSearches().filter((entry) => entry !== query);
  const next = [query, ...existing].slice(0, MAX_RECENT);
  localStorage.setItem(RECENT_SEARCHES_KEY, JSON.stringify(next));
  return next;
}

const emptyResults: SearchResponse = {
  products: [],
  collections: [],
  projects: [],
  pages: [],
};

export function SearchDrawer({
  open,
  onClose,
  locale,
  dictionary,
}: {
  open: boolean;
  onClose: () => void;
  locale: Locale;
  dictionary: Dictionary;
}) {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<SearchResponse>(emptyResults);
  const [recent, setRecent] = useState<string[]>([]);
  const inputRef = useRef<HTMLInputElement>(null);
  const panelRef = useRef<HTMLDivElement>(null);
  const router = useRouter();
  const s = dictionary.search;

  /**
   * Every open starts blank. `open` only toggles what this component
   * *renders* — it stays mounted either way, so `query` survived a close and
   * the drawer reopened showing the previous search and its results, as if
   * the visitor had typed it again. Reset during render rather than in an
   * effect, so the drawer never paints one frame of the old query before
   * clearing it. (Same pattern, and the same reason, as `MobileMenu`'s
   * `openedWith`.)
   */
  const [openedWith, setOpenedWith] = useState(open);
  if (openedWith !== open) {
    setOpenedWith(open);
    if (open) {
      setQuery("");
      setResults(emptyResults);
      // Read here rather than in an effect for the same reason: the list is
      // wanted in the drawer's very first painted frame, and another tab may
      // have added to it since this one last looked. `open` is false on the
      // server and only flips in response to a click, so this never runs
      // during SSR.
      setRecent(readRecentSearches());
    }
  }

  /**
   * Focus trap, Escape, scroll lock and focus-restore-to-trigger, shared with
   * the other modal overlays. This drawer previously had only an Escape
   * handler while still declaring `aria-modal="true"` — so a keyboard or
   * screen-reader user was told the page behind was inert, then Tab walked
   * them straight into it, and the page scrolled underneath.
   *
   * Focus goes to the input, not the first focusable element: someone who
   * opened search intends to type.
   */
  useDialogBehaviour({ open, onClose, panelRef, initialFocusRef: inputRef });

  /**
   * The debounce delays a request; it does not stop an earlier one that is
   * already in flight. Type "ваз", pause long enough to fire, then add "он",
   * and two requests are open at once — and nothing made them come back in
   * order. On a slow connection the reply for "ваз" can land after the reply
   * for "вазон", and the drawer then shows results for a prefix of what the
   * input says, with no way for the visitor to make it correct itself: the
   * query state has not changed, so no new fetch is coming.
   *
   * Aborting the previous request on every change collapses that to one
   * in-flight request per drawer, so the last response is always the current
   * one. (Same class of bug as the cart's slow-fetch overwrite, fixed the same
   * way: whoever is stale loses rather than whoever is slowest wins.)
   */
  useEffect(() => {
    if (!query.trim()) {
      const timeout = setTimeout(() => setResults(emptyResults), 0);
      return () => clearTimeout(timeout);
    }
    const controller = new AbortController();
    const timeout = setTimeout(() => {
      fetch(`/api/search?q=${encodeURIComponent(query)}&locale=${locale}`, {
        signal: controller.signal,
      })
        .then((response) => response.json())
        .then((data: SearchResponse) => setResults(data))
        .catch((error: unknown) => {
          // An abort is this effect cleaning up after itself, not a failure —
          // blanking the results here would clear the list every keystroke.
          if (error instanceof DOMException && error.name === "AbortError") {
            return;
          }
          setResults(emptyResults);
        });
    }, 250);
    return () => {
      clearTimeout(timeout);
      controller.abort();
    };
  }, [query, locale]);

  if (!open) return null;

  const hasQuery = query.trim().length > 0;
  const hasResults =
    results.products.length > 0 ||
    results.collections.length > 0 ||
    results.projects.length > 0 ||
    results.pages.length > 0;

  function commitSearch(value: string) {
    if (!value.trim()) return;
    setRecent(saveRecentSearch(value.trim()));
  }

  /**
   * Enter used to call `commitSearch` and stop there — it wrote the term to
   * the recent-searches list and did nothing else. The drawer stayed open on
   * the same truncated preview, so pressing Enter in a search box read as
   * "nothing happened", and the only way to the full results page was to
   * notice the small "View all" link at the bottom of the list. Enter now
   * goes where the visitor plainly meant it to go — the same destination as
   * that link.
   */
  function submitSearch(value: string) {
    const trimmed = value.trim();
    if (!trimmed) return;
    commitSearch(trimmed);
    onClose();
    router.push(localeHref(locale, `/search?q=${encodeURIComponent(trimmed)}`));
  }

  return (
    <div className="fixed inset-0 z-50">
      {/* Prompt 9 §6 (visual consistency audit) — same dismissible-overlay
          role as `DialogPrimitive`'s backdrop (Modal/Drawer), so it uses the
          same `bg-black/40` opacity rather than a slightly different
          one-off value. (MegaMenu's lighter page-dim and the product
          gallery's near-opaque lightbox backdrop are deliberately different
          — those dim live nav content or maximize photo contrast, not a
          dismissible modal/drawer scrim, so they keep their own values.) */}
      <div
        className="absolute inset-0 bg-black/40"
        onClick={onClose}
        aria-hidden="true"
      />
      <div
        ref={panelRef}
        role="dialog"
        aria-modal="true"
        aria-label={s.title}
        className="bg-surface relative mx-auto flex max-h-[80vh] max-w-3xl flex-col overflow-y-auto"
        style={{ marginTop: "var(--header-stack-height, 0px)" }}
      >
        <div className="border-border flex items-center gap-(--space-sm) border-b p-(--space-md)">
          <svg
            aria-hidden="true"
            viewBox="0 0 24 24"
            className="text-text-muted h-5 w-5 shrink-0"
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
          <input
            ref={inputRef}
            type="search"
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            onKeyDown={(event) => {
              if (event.key === "Enter") {
                event.preventDefault();
                submitSearch(query);
              }
            }}
            placeholder={s.placeholder}
            className="type-body text-text placeholder:text-text-muted h-full flex-1 bg-transparent outline-none"
          />
          {query ? (
            <button
              type="button"
              aria-label={s.clearLabel}
              onClick={() => setQuery("")}
              className="text-text-muted hover:text-text shrink-0"
            >
              <svg aria-hidden="true" viewBox="0 0 24 24" className="h-4 w-4">
                <path
                  d="M6 6l12 12M18 6L6 18"
                  stroke="currentColor"
                  strokeWidth="2"
                />
              </svg>
            </button>
          ) : null}
          <button
            type="button"
            aria-label={s.closeLabel}
            onClick={onClose}
            className="text-text-muted hover:text-text shrink-0"
          >
            <svg aria-hidden="true" viewBox="0 0 24 24" className="h-5 w-5">
              <path
                d="M6 6l12 12M18 6L6 18"
                stroke="currentColor"
                strokeWidth="2"
              />
            </svg>
          </button>
        </div>

        {/* Search-as-you-type replaces the result list without moving focus,
            so a screen-reader user gets no indication that anything happened —
            WCAG 4.1.3 (Status Messages). This is the status message: an empty
            live region that is present from the moment the drawer opens (a
            region inserted at the same time as its text is often not announced
            at all) and only ever holds the count. `aria-atomic` so the whole
            sentence is re-read rather than just the changed digits. The copy
            already existed for the full search page — no new strings. */}
        <p aria-live="polite" aria-atomic="true" className="sr-only">
          {hasQuery
            ? hasResults
              ? formatTemplate(s.resultsCount, {
                  count:
                    results.products.length +
                    results.collections.length +
                    results.projects.length +
                    results.pages.length,
                })
              : s.noResultsHeading
            : ""}
        </p>

        <div className="flex-1 p-(--space-md)">
          {!hasQuery ? (
            <div className="flex flex-col gap-(--space-lg)">
              {recent.length > 0 ? (
                <div>
                  <h3 className="type-technical-label text-text-muted mb-(--space-2xs)">
                    {s.recentHeading}
                  </h3>
                  <ul className="flex flex-wrap gap-(--space-2xs)">
                    {recent.map((entry) => (
                      <li key={entry}>
                        <button
                          type="button"
                          onClick={() => setQuery(entry)}
                          className="type-body-sm border-border hover:border-border-strong border px-(--space-xs) py-(--space-3xs)"
                        >
                          {entry}
                        </button>
                      </li>
                    ))}
                  </ul>
                </div>
              ) : null}

              <div>
                <h3 className="type-technical-label text-text-muted mb-(--space-2xs)">
                  {s.popularHeading}
                </h3>
                <ul className="flex flex-wrap gap-(--space-2xs)">
                  {shopCategories.map((category) => (
                    <li key={category}>
                      <Link
                        href={localeHref(locale, shopCategoryPath(category))}
                        onClick={onClose}
                        className="type-body-sm border-border hover:border-border-strong border px-(--space-xs) py-(--space-3xs)"
                      >
                        {shopCategoryLabel(category, dictionary)}
                      </Link>
                    </li>
                  ))}
                </ul>
              </div>
            </div>
          ) : !hasResults ? (
            <div className="py-(--space-lg) text-center">
              <p className="type-h4 text-text">{s.noResultsHeading}</p>
              <p className="type-body-sm text-text-muted mt-(--space-2xs)">
                {s.noResultsBody}
              </p>
            </div>
          ) : (
            <div className="flex flex-col gap-(--space-lg)">
              {results.products.length > 0 ? (
                <div>
                  <h3 className="type-technical-label text-text-muted mb-(--space-2xs)">
                    {s.productsHeading}
                  </h3>
                  <ul className="flex flex-col gap-(--space-xs)">
                    {results.products.map((product) => (
                      <li key={product.slug}>
                        <Link
                          href={localeHref(locale, `/products/${product.slug}`)}
                          onClick={() => {
                            commitSearch(query);
                            onClose();
                          }}
                          className="hover:bg-surface-muted flex items-center gap-(--space-sm) p-(--space-2xs)"
                        >
                          <span
                            className="bg-surface-muted h-12 w-12 shrink-0 bg-cover bg-center"
                            style={{ backgroundImage: `url(${product.photo})` }}
                          />
                          <span className="flex-1">
                            <span className="type-body-sm text-text block">
                              {product.name}
                            </span>
                            <span className="type-caption text-text-muted block">
                              {product.category}
                            </span>
                          </span>
                          {/* Was a one-off `Intl.NumberFormat` + a bare "₴",
                              the only place on the site that used the symbol.
                              `Price` is the single source of truth for how a
                              price looks. */}
                          <Price amount={product.price} locale={locale} />
                        </Link>
                      </li>
                    ))}
                  </ul>
                </div>
              ) : null}

              {results.pages.length > 0 ? (
                <div>
                  <h3 className="type-technical-label text-text-muted mb-(--space-2xs)">
                    {s.pagesHeading}
                  </h3>
                  <ul className="flex flex-col gap-(--space-2xs)">
                    {results.pages.map((page) => (
                      <li key={page.href}>
                        <Link
                          href={page.href}
                          onClick={() => {
                            commitSearch(query);
                            onClose();
                          }}
                          className="type-body-sm text-text hover:text-text-muted block"
                        >
                          {page.title}
                        </Link>
                      </li>
                    ))}
                  </ul>
                </div>
              ) : null}

              <Link
                href={localeHref(
                  locale,
                  `/search?q=${encodeURIComponent(query)}`,
                )}
                onClick={() => {
                  commitSearch(query);
                  onClose();
                }}
                className="type-nav text-text underline underline-offset-4"
              >
                {s.viewAll}
              </Link>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
