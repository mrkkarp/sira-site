"use client";

import { useLayoutEffect, useRef, useState } from "react";
import type { Locale } from "@/i18n/config";
import type { Dictionary } from "@/i18n/get-dictionary";
import type { Product } from "@/lib/schemas/product";
import { localeHref } from "@/lib/locale-href";
import { cn } from "@/lib/cn";
import { Section, Container, SectionHeader } from "@/components/layout";
import { TextLink } from "@/components/ui/text-link";
import { IconButton } from "@/components/ui/icon-button";
import { ProductCard } from "@/components/product/product-card";

/**
 * Horizontal, CSS-scroll-snap product slider (Prompt 4 §4) — no JS drag
 * library, native touch scroll handles mobile swipe. Desktop gets
 * prev/next arrow buttons plus a simple progress indicator; both just call
 * `scrollIntoView` on the target card.
 */
// The scroll-snap "step" per card, including the gap between cards. Reading
// two adjacent children's real `offsetLeft` (rather than hardcoding the
// gap's pixel value) stays correct regardless of viewport width — the track
// uses the fluid `--space-md` token (a `clamp()` between 24px and 32px), so
// a hardcoded gap constant would drift out of sync with the actual scroll
// position at wider viewports.
function getScrollStep(track: HTMLDivElement): number {
  const first = track.children[0] as HTMLElement | undefined;
  const second = track.children[1] as HTMLElement | undefined;
  if (first && second) return second.offsetLeft - first.offsetLeft;
  return first?.getBoundingClientRect().width ?? 1;
}

export function PopularProducts({
  products,
  locale,
  dictionary,
}: {
  products: Product[];
  locale: Locale;
  dictionary: Dictionary;
}) {
  const copy = dictionary.home.popularProducts;
  const trackRef = useRef<HTMLDivElement>(null);
  const [active, setActive] = useState(0);

  const scrollToIndex = (index: number) => {
    const clamped = Math.max(0, Math.min(products.length - 1, index));
    setActive(clamped);
    const track = trackRef.current;
    const card = track?.children[clamped];
    // Scroll only the track's own `scrollLeft`, not `card.scrollIntoView()`
    // — the latter can also drag the page's vertical scroll position (see
    // the same fix in `hero-carousel.tsx`).
    if (track && card instanceof HTMLElement) {
      track.scrollTo({ left: card.offsetLeft, behavior: "smooth" });
    }
  };

  // Some browsers restore this track's own `scrollLeft` on reload
  // independent of React state (see the identical fix in
  // `hero-carousel.tsx`). Here the desync is only cosmetic — the wrong
  // dot would read as active — but re-derive `active` from whatever
  // scroll position the browser actually landed on, before paint, so the
  // indicator is never wrong on load.
  useLayoutEffect(() => {
    const track = trackRef.current;
    if (!track) return;
    const index = Math.round(track.scrollLeft / getScrollStep(track));
    setActive(Math.max(0, Math.min(products.length - 1, index)));
  }, [products.length]);

  // Defensive: if none of the configured popular slugs resolve to a real
  // catalog product, hide the section rather than render an empty slider.
  if (products.length === 0) return null;

  return (
    <Section spacing="xl" tone="surface">
      <Container>
        <SectionHeader
          eyebrow={copy.eyebrow}
          heading={copy.heading}
          description={copy.body}
          action={
            <TextLink href={localeHref(locale, "/shop")} variant="underlined">
              {copy.viewAllCta}
            </TextLink>
          }
        />
        <div className="relative mt-(--space-lg)">
          <div
            ref={trackRef}
            className="flex snap-x snap-mandatory [scrollbar-width:none] gap-(--space-md) overflow-x-auto scroll-smooth pb-(--space-xs) [&::-webkit-scrollbar]:hidden"
            onScroll={(event) => {
              const track = event.currentTarget;
              const index = Math.round(track.scrollLeft / getScrollStep(track));
              setActive(Math.max(0, Math.min(products.length - 1, index)));
            }}
          >
            {products.map((product) => (
              <div
                key={product.slug}
                className="w-[85%] shrink-0 snap-start sm:w-[45%] lg:w-[calc(25%-var(--space-md)*3/4)]"
              >
                {/* No `priority`: this carousel sits below the full-viewport
                    hero, so its cards are off-screen at first paint. Preloading
                    them (measured: 2 competing `<link rel=preload as=image>`)
                    stole throttled-mobile bandwidth from the hero LCP image,
                    inflating LCP render-delay. Default lazy-loading is correct
                    for below-the-fold imagery. */}
                <ProductCard
                  product={product}
                  locale={locale}
                  dictionary={dictionary}
                />
              </div>
            ))}
          </div>

          <div className="mt-(--space-sm) flex flex-wrap items-center justify-between gap-(--space-xs)">
            {/* Prompt 9 §2 (accessibility audit) — plain labelled buttons,
                not `role="tablist"`/`role="tab"`: there's no associated
                `tabpanel` and no arrow-key roving-focus behaviour a real
                tablist implies (contrast `src/components/ui/tabs.tsx`,
                which does implement that), so the tab semantics were
                misleading (WCAG 4.1.2). `aria-current` is the correct,
                behaviour-free way to mark the active slide (matches
                `hero-carousel.tsx`'s dots). Each `<button>` also gets a
                24×24 minimum hit area (SC 2.5.8) via padding around the
                visually-thin 4px bar, rather than making the bar itself
                that tall. */}
            <div
              className="flex flex-wrap gap-(--space-2xs)"
              aria-label={copy.heading}
            >
              {products.map((product, index) => (
                <button
                  key={product.slug}
                  type="button"
                  aria-current={index === active}
                  aria-label={`${copy.nextLabel} ${index + 1}`}
                  onClick={() => scrollToIndex(index)}
                  className="flex h-6 w-6 items-center justify-center"
                >
                  <span
                    aria-hidden="true"
                    className={cn(
                      "h-1 w-6 transition-colors duration-(--duration-fast)",
                      index === active ? "bg-text" : "bg-border",
                    )}
                  />
                </button>
              ))}
            </div>
            <div className="flex gap-(--space-2xs)">
              <IconButton
                aria-label={copy.prevLabel}
                onClick={() => scrollToIndex(active - 1)}
                disabled={active === 0}
                icon={
                  <svg
                    aria-hidden="true"
                    viewBox="0 0 24 24"
                    className="h-5 w-5"
                  >
                    <path
                      d="M15 6l-6 6 6 6"
                      stroke="currentColor"
                      strokeWidth="1.5"
                      fill="none"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    />
                  </svg>
                }
              />
              <IconButton
                aria-label={copy.nextLabel}
                onClick={() => scrollToIndex(active + 1)}
                disabled={active === products.length - 1}
                icon={
                  <svg
                    aria-hidden="true"
                    viewBox="0 0 24 24"
                    className="h-5 w-5"
                  >
                    <path
                      d="M9 6l6 6-6 6"
                      stroke="currentColor"
                      strokeWidth="1.5"
                      fill="none"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    />
                  </svg>
                }
              />
            </div>
          </div>
        </div>
      </Container>
    </Section>
  );
}
