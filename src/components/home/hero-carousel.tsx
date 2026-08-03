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
  // Only show hero slides that have real, delivered photography — a slide
  // still waiting on its image must never fall back to the "Фото очікується"
  // placeholder for visitors (IMAGE_REQUIREMENTS.md bans stock/AI stand-ins).
  // Filtering here (rather than rendering a placeholder) means an unphotographed
  // campaign simply drops out until its image is added to `heroCampaigns`.
  const campaigns = heroCampaigns.filter((campaign) => Boolean(campaign.image));
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

  // Defensive: if no campaign has delivered photography yet, hide the hero
  // rather than render an empty full-viewport frame.
  if (campaigns.length === 0) return null;

  return (
    <section
      className="relative"
      // Pulled up under the header so the photograph — not the page's own
      // background — is what the transparent header bar floats over. There is
      // deliberately NO compensating `padding-top` here: padding on the
      // *section* would push the slide (and therefore the image) back below
      // the bar, leaving a light strip behind a bar whose ink has already
      // flipped to the light-on-dark treatment, i.e. invisible navigation.
      // The clearance lives on each slide's copy container instead.
      style={{ marginTop: "calc(-1 * var(--header-stack-height))" }}
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
        // `86svh`, not the full `100svh` this used to be. At exactly one
        // viewport the hero *is* the first screen: nothing below it shows, so
        // the page gives no sign that anything follows, and the photograph
        // reads as oversized because there is nothing to measure it against.
        // Giving back ~14 % puts the top edge of the category grid on screen,
        // which is both the scroll cue and the sense of scale. The hero is
        // still much the largest thing on the page.
        //
        // The floor is 360px, and it is a floor for a genuinely tiny viewport
        // rather than a design size. It replaces a 420px floor plus a
        // `[@media(min-height:700px)]:min-h-[560px]` step, both of which were
        // sized against `100svh`: at 86 % the 560px step can only ever bind
        // below 651px of viewport height, where its own media query has
        // already switched it off, and 420px would have overflowed a landscape
        // phone (86 % of 414px is 356px). Tailwind's `sm:`/`md:` variants key
        // off *width*, so they cannot tell a landscape phone from a portrait
        // tablet — hence a height-keyed floor rather than a breakpoint.
        className="flex h-[86svh] min-h-[360px] snap-x snap-mandatory [scrollbar-width:none] overflow-x-auto scroll-smooth [&::-webkit-scrollbar]:hidden"
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
                  // `pt` is the header clearance the section deliberately
                  // doesn't apply: the image runs under the bar, the copy
                  // never does.
                  "relative mx-auto flex h-full max-w-[1600px] flex-col justify-end gap-(--space-sm) px-6 pt-(--header-stack-height) pb-(--space-2xl) md:px-10",
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
