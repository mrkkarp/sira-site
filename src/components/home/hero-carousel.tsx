"use client";

import Link from "next/link";
import {
  useCallback,
  useEffect,
  useLayoutEffect,
  useRef,
  useState,
} from "react";
import type { Locale } from "@/i18n/config";
import type { Dictionary } from "@/i18n/get-dictionary";
import { heroCampaigns } from "@/config/homepage";
import { localeHref } from "@/lib/locale-href";
import { cn } from "@/lib/cn";
import { LinkButton } from "@/components/ui/link-button";
import { HeroBoundary } from "@/components/header/hero-boundary";
import { ImagePlaceholder } from "@/components/home/image-placeholder";
import { ProductImage } from "@/components/product/product-image";

const AUTOPLAY_MS = 7000;

/**
 * Full-viewport hero carousel (Prompt 4 §1). Uses native horizontal
 * scroll-snap rather than a JS drag library — that gives mobile swipe for
 * free and keeps the desktop track simple. Auto-rotation is slow, stops the
 * moment the visitor interacts (pointer, key, or focus), is skipped
 * entirely under `prefers-reduced-motion`, and only runs at all when there
 * is more than one campaign.
 */
export function HeroCarousel({
  locale,
  dictionary,
}: {
  locale: Locale;
  dictionary: Dictionary;
}) {
  const campaigns = heroCampaigns;
  const copy = dictionary.home.hero;
  const [active, setActive] = useState(0);
  const [autoplay, setAutoplay] = useState(campaigns.length > 1);
  const trackRef = useRef<HTMLDivElement>(null);

  // Scrolls only the track's own horizontal `scrollLeft` — deliberately
  // NOT `slide.scrollIntoView()`, which would also drag the *page's*
  // vertical scroll position back up to the hero the moment autoplay fires
  // while a visitor has scrolled further down the homepage.
  const scrollTrackTo = useCallback((index: number) => {
    const track = trackRef.current;
    const slide = track?.children[index];
    if (track && slide instanceof HTMLElement) {
      track.scrollTo({ left: slide.offsetLeft, behavior: "smooth" });
    }
  }, []);

  const goTo = useCallback(
    (index: number) => {
      const clamped = (index + campaigns.length) % campaigns.length;
      setActive(clamped);
      scrollTrackTo(clamped);
    },
    [campaigns.length, scrollTrackTo],
  );

  // On (re)load, some browsers restore a scrollable element's own
  // `scrollLeft` from the previous page instance (independent of React
  // state and independent of the window's own scroll-restoration). Left
  // uncorrected, that desyncs the track from `active`: the slide React
  // thinks is showing (and marks accessible) is not the one actually in
  // view, while the visually-showing slide sits `aria-hidden`/`inert`.
  // Force the track back in sync with `active` before paint, with no
  // animation, so a mid-session reload can never show this mismatch.
  useLayoutEffect(() => {
    const track = trackRef.current;
    const slide = track?.children[active];
    if (track && slide instanceof HTMLElement) {
      track.scrollLeft = slide.offsetLeft;
    }
    // Deliberately mount-only: this corrects the browser's restored
    // scroll position once; subsequent slide changes are driven by
    // `goTo`/autoplay via `scrollTrackTo`, not this effect.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (!autoplay || campaigns.length < 2) return;
    if (
      typeof window !== "undefined" &&
      window.matchMedia("(prefers-reduced-motion: reduce)").matches
    ) {
      return;
    }
    const id = window.setInterval(() => {
      setActive((current) => {
        const next = (current + 1) % campaigns.length;
        scrollTrackTo(next);
        return next;
      });
    }, AUTOPLAY_MS);
    return () => window.clearInterval(id);
  }, [autoplay, campaigns.length, scrollTrackTo]);

  const stopAutoplay = () => setAutoplay(false);

  return (
    <section
      className="relative"
      style={{
        marginTop: "calc(-1 * var(--header-stack-height))",
        paddingTop: "var(--header-stack-height)",
      }}
      onPointerDown={stopAutoplay}
      onKeyDown={(event) => {
        stopAutoplay();
        if (event.key === "ArrowRight") goTo(active + 1);
        if (event.key === "ArrowLeft") goTo(active - 1);
      }}
      aria-roledescription={campaigns.length > 1 ? "carousel" : undefined}
    >
      <div
        ref={trackRef}
        // Prompt 9 §1/§6 (responsive + visual consistency audit) — a flat
        // `min-h-[560px]` floor exceeded `100svh` on short landscape phones
        // (~375-414px tall), forcing the "full-viewport" hero to overflow
        // past the fold on exactly the devices where headroom is tightest.
        // Tailwind's `sm:`/`md:` variants key off *width*, which doesn't
        // distinguish a landscape phone (wide but short) from a portrait
        // tablet, so this uses an arbitrary `min-height` media variant
        // instead: only apply the taller 560px floor once the viewport
        // itself has enough height to fit it without overflowing.
        className="flex h-[calc(100svh-var(--header-stack-height))] min-h-[420px] snap-x snap-mandatory [scrollbar-width:none] overflow-x-auto scroll-smooth [&::-webkit-scrollbar]:hidden [@media(min-height:700px)]:min-h-[560px]"
      >
        {campaigns.map((campaign, index) => {
          const campaignCopy = copy[campaign.copyKey];
          const isDark = campaign.theme === "dark";
          return (
            <article
              key={campaign.id}
              className={cn(
                "relative h-full w-full shrink-0 snap-start",
                isDark ? "bg-footer text-background" : "bg-surface text-text",
              )}
              aria-hidden={index !== active}
              inert={index !== active}
            >
              <div className="absolute inset-0">
                {/* This is the homepage's LCP element: the first slide gets
                    `priority` (and the others don't), with a `sizes` matching
                    this full-viewport frame. Slides still waiting on real
                    photography fall back to the "Фото очікується" placeholder
                    (see IMAGE_REQUIREMENTS.md — no stock/AI stand-ins). */}
                {campaign.image ? (
                  <>
                    <ProductImage
                      src={campaign.image}
                      alt={campaignCopy.title}
                      priority={index === 0}
                      sizes="100vw"
                      className="object-cover"
                      brokenLabel={
                        dictionary.megaMenu.catalog.editorialImageAlt
                      }
                    />
                    {/* Scrim so the light hero copy stays legible over a
                        photo of arbitrary brightness. */}
                    <div
                      aria-hidden="true"
                      className={cn(
                        "absolute inset-0",
                        isDark
                          ? "from-footer/85 via-footer/45 to-footer/25 bg-gradient-to-t"
                          : "from-surface/85 via-surface/40 to-surface/15 bg-gradient-to-t",
                      )}
                    />
                  </>
                ) : (
                  <ImagePlaceholder
                    label={dictionary.megaMenu.catalog.editorialImageAlt}
                    className="opacity-30"
                  />
                )}
              </div>
              <div
                className={cn(
                  "relative mx-auto flex h-full max-w-[1600px] flex-col justify-end gap-(--space-sm) px-6 pb-(--space-2xl) md:px-10",
                  campaign.textPosition === "center" &&
                    "items-center text-center",
                  campaign.textPosition === "right" && "items-end text-right",
                )}
              >
                <p className="type-eyebrow opacity-70">
                  {campaignCopy.eyebrow}
                </p>
                {/* Only the first campaign gets the real `<h1>` — with
                    multiple campaigns all mounted at once (for scroll-snap),
                    every other slide's heading renders as a `<p>` styled
                    identically, so the page keeps exactly one H1 (Prompt 4 §14). */}
                {index === 0 ? (
                  <h1 className="type-display-l max-w-3xl">
                    {campaignCopy.title}
                  </h1>
                ) : (
                  <p className="type-display-l max-w-3xl">
                    {campaignCopy.title}
                  </p>
                )}
                <p className="type-body-lg max-w-xl opacity-90">
                  {campaignCopy.description}
                </p>
                <div className="flex flex-wrap items-center gap-(--space-md) pt-2">
                  <LinkButton
                    href={localeHref(locale, campaign.primaryHref)}
                    variant={isDark ? "outline-light" : "primary-dark"}
                  >
                    {campaignCopy.primaryCta}
                  </LinkButton>
                  <Link
                    href={localeHref(locale, campaign.secondaryHref)}
                    className={cn(
                      "type-nav underline underline-offset-4 transition-colors duration-(--duration-fast)",
                      isDark
                        ? "text-background/80 decoration-background/50 hover:text-background hover:decoration-background"
                        : "text-text-muted decoration-border-strong hover:text-text hover:decoration-text",
                    )}
                  >
                    {campaignCopy.secondaryCta}
                  </Link>
                </div>
              </div>
            </article>
          );
        })}
      </div>

      {campaigns.length > 1 ? (
        <div className="absolute bottom-(--space-lg) left-1/2 flex -translate-x-1/2 items-center gap-(--space-sm)">
          <button
            type="button"
            aria-label={copy.prevLabel}
            onClick={() => {
              stopAutoplay();
              goTo(active - 1);
            }}
            className="text-background/70 hover:text-background type-nav px-(--space-2xs)"
          >
            ‹
          </button>
          <div className="flex gap-(--space-2xs)">
            {campaigns.map((campaign, index) => (
              // Prompt 9 §2 (accessibility audit) — SC 2.5.8 wants a 24×24
              // minimum hit area; padding around the visually-thin 4px bar
              // gets there without making the bar itself that tall.
              <button
                key={campaign.id}
                type="button"
                aria-label={`${copy.goToLabel} ${index + 1}`}
                aria-current={index === active}
                onClick={() => {
                  stopAutoplay();
                  goTo(index);
                }}
                className="flex h-6 w-6 items-center justify-center"
              >
                <span
                  aria-hidden="true"
                  className={cn(
                    "h-1 w-6 transition-colors duration-(--duration-fast)",
                    index === active ? "bg-background" : "bg-background/40",
                  )}
                />
              </button>
            ))}
          </div>
          <button
            type="button"
            aria-label={copy.nextLabel}
            onClick={() => {
              stopAutoplay();
              goTo(active + 1);
            }}
            className="text-background/70 hover:text-background type-nav px-(--space-2xs)"
          >
            ›
          </button>
        </div>
      ) : null}

      <HeroBoundary />
    </section>
  );
}
