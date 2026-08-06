"use client";

import { useState } from "react";
import type { CSSProperties } from "react";
import Link from "next/link";
import type { Locale } from "@/i18n/config";
import type { Dictionary } from "@/i18n/get-dictionary";
import { localeHref } from "@/lib/locale-href";
import { cn } from "@/lib/cn";
import { catalogTree } from "@/config/navigation";
import { RollingLabel } from "@/components/header/rolling-label";
import { BrandAccentLine } from "@/components/brand";
import {
  CoordinateLabel,
  DrawingFrame,
  DrawingMarker,
  LeaderLine,
  TechnicalCaption,
  TechnicalLine,
  drawingIndex,
} from "@/components/technical-drawing";

type CatalogCopy = Dictionary["catalogNav"];

function label(copy: CatalogCopy, key: string) {
  return copy[key as keyof CatalogCopy];
}

function Arrow({ className }: { className?: string }) {
  return (
    <svg
      aria-hidden="true"
      viewBox="0 0 16 16"
      className={cn("h-3.5 w-3.5", className)}
    >
      <path
        d="M3 8h10M9 4l4 4-4 4"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.4"
      />
    </svg>
  );
}

/**
 * The catalogue plane, drawn as a sheet. Not a dropdown — a full-width
 * editorial layer split into three fields by construction guides: a rail
 * (where you are), the tree (where you can go), and a preview that answers
 * "what am I pointing at?" without loading anything.
 *
 * ## What the drawing contributes here
 *
 * A view caption and a live position readout over a ruled top line; a position
 * circle per category instead of a bare numeral; a leader running from the
 * preview's circle to the part it names; corner registration marks around the
 * preview; a title-block reference under it. That is the whole of it — the
 * panel is still 90% type and white space, which is the split the brief asks
 * for. The tree rows deliberately get *no* leader: at two columns the longest
 * category name leaves no gap to bridge, and a leader with nothing to cross is
 * decoration.
 *
 * ## Why the preview is typographic and not an image
 *
 * The brief allows one contextual image here. It is deliberately not used:
 * the header renders on *every* route, so a photo preview would mean either a
 * catalogue query in the root layout (a database round-trip added to every
 * page render) or a hard-coded image list that drifts from the real
 * catalogue. Neither is worth it for a hover affordance. The preview instead
 * restates the pointed-at category in display type with its real sub-splits
 * and its real route — same "the panel is alive and responding" feedback, zero
 * bytes and zero queries. Revisit if/when the header is given real category
 * media.
 *
 * The route is shown because it is the only other thing about a category that
 * is true without asking the database. Counts, price ranges and hero images
 * are all real facts we do not have in the header, and none of them will be
 * invented to fill the frame.
 *
 * ## Why the sub-categories are also inline in the list
 *
 * They are the only route to `?mount=` / `?placement=`, so they must be
 * reachable by keyboard in a predictable order. If they lived only in the
 * preview column, tabbing from "Раковини" to "Вазони" would swap the preview
 * out from under the user before they could reach the sub-links. Inline they
 * follow their parent naturally; the preview then repeats them as plain text,
 * never as a second set of tab stops.
 *
 * Every href here is data-backed — see the note on `catalogTree` in
 * `src/config/navigation.ts`.
 */
export function CatalogMenuContent({
  locale,
  dictionary,
  open,
}: {
  locale: Locale;
  dictionary: Dictionary;
  /** Drives the staggered entrance: the class is applied only while the panel
   *  is open, so removing and re-adding it replays the animation on every
   *  open without remounting (and therefore without re-running `Link`
   *  prefetch or losing the panel's scroll position). */
  open: boolean;
}) {
  const copy = dictionary.catalogNav;
  const [activeIndex, setActiveIndex] = useState(0);

  // Every fresh open starts on the first category rather than wherever the
  // pointer happened to leave off, so the plane reads the same way each time.
  //
  // Adjusted during render rather than in an effect: React re-runs this
  // component before touching the DOM, so the preview is never painted showing
  // the previous session's category and then corrected. (An effect would also
  // be a cascading render — see the `set-state-in-effect` lint rule.)
  const [openedWith, setOpenedWith] = useState(open);
  if (openedWith !== open) {
    setOpenedWith(open);
    if (open) setActiveIndex(0);
  }

  const active = catalogTree[activeIndex] ?? catalogTree[0];

  return (
    <div className="mx-auto max-w-[100rem] px-(--space-md) py-(--space-md)">
      {/* The sheet's head: the view caption at one edge, the position readout
          at the other, over the line they hang off. The readout is the panel's
          "a number appears on hover" — it counts the real tree, so it can
          never disagree with what is under the pointer. */}
      <div className="flex items-end justify-between pb-(--space-2xs)">
        <TechnicalCaption>{copy.eyebrow}</TechnicalCaption>
        <CoordinateLabel>
          {drawingIndex(activeIndex + 1)} / {drawingIndex(catalogTree.length)}
        </CoordinateLabel>
      </div>
      <TechnicalLine weight="line" draw={open} />

      <div className="grid grid-cols-12 gap-(--space-lg) pt-(--space-md)">
        <div className="col-span-12 lg:col-span-2">
          <Link
            href={localeHref(locale, "/shop")}
            className="group type-nav text-text inline-flex min-h-11 items-center gap-(--space-2xs)"
          >
            <RollingLabel>{copy.allProducts}</RollingLabel>
            <Arrow className="transition-transform duration-(--duration-normal) ease-(--ease-nav) group-hover:translate-x-1" />
          </Link>
        </div>

        {/* Construction guide between the fields. A ruled vertical is what a
            draughtsman puts between two columns of a sheet, and it replaces the
            heavier `--color-border` divider this panel used before. */}
        <ul className="border-drawing-line-subtle col-span-12 grid grid-cols-1 gap-x-(--space-lg) gap-y-(--space-2xs) md:grid-cols-2 lg:col-span-6 lg:border-l lg:pl-(--space-md)">
          {catalogTree.map((node, index) => (
            <li
              key={node.href}
              style={{ "--i": index } as CSSProperties}
              className={cn(open && "nav-row")}
              onPointerEnter={() => setActiveIndex(index)}
            >
              <Link
                href={localeHref(locale, node.href)}
                onFocus={() => setActiveIndex(index)}
                className="group flex flex-col gap-(--space-3xs) py-(--space-2xs)"
              >
                <span className="flex items-center gap-(--drawing-gap)">
                  {/* Position circle, filled while this row is the one the
                      preview is drawing. Same mark as the sheet's ①–⑦. */}
                  <DrawingMarker filled={index === activeIndex}>
                    {index + 1}
                  </DrawingMarker>
                  <span className="type-h2 text-text transition-transform duration-(--duration-normal) ease-(--ease-nav) group-hover:translate-x-1">
                    {label(copy, node.labelKey)}
                  </span>
                </span>
                {/* The row's rule: construction weight always, with an overlay
                    that draws itself across on hover. A transform, so it is one
                    composited frame and the reduced-motion rule already removes
                    it. This markup used to be written out here by hand and was
                    character-for-character `BrandAccentLine`, so it is now that
                    component — the only change being that the overlay is the
                    brand accent rather than full ink.

                    Only the seven top-level rows get the colour. The child
                    links below keep their ink underline on purpose: there are
                    dozens of them set close together, and colouring every one
                    turns a dense list into confetti. Seven rows lit strictly
                    one at a time is a single coloured stroke on screen. */}
                <BrandAccentLine onHover />
              </Link>

              {node.children ? (
                <ul className="flex flex-wrap gap-x-(--space-sm)">
                  {node.children.map((child) => (
                    <li key={child.href}>
                      {/* `min-h-11` for the 44px target minimum: these rendered
                          26px tall, and they are the only way to reach the
                          `?mount=` / `?placement=` views. The underline moves to
                          an inner span so it keeps hugging the text instead of
                          dropping to the bottom of the taller box. */}
                      <Link
                        href={localeHref(locale, child.href)}
                        onFocus={() => setActiveIndex(index)}
                        className="group type-technical-label text-text-muted hover:text-text inline-flex min-h-11 items-center transition-colors duration-(--duration-normal)"
                      >
                        <span className="relative">
                          {label(copy, child.labelKey)}
                          <span
                            aria-hidden="true"
                            className="bg-text absolute inset-x-0 -bottom-(--space-3xs) h-px origin-left scale-x-0 transition-transform duration-(--duration-normal) ease-(--ease-nav) group-hover:scale-x-100 group-focus-visible:scale-x-100"
                          />
                        </span>
                      </Link>
                    </li>
                  ))}
                </ul>
              ) : null}
            </li>
          ))}
        </ul>

        {/* Preview. `aria-hidden`: everything in here is a restatement of a
            link the user has just landed on, so announcing it again would only
            add noise — and the one interactive element (the CTA) duplicates the
            category link two columns to the left. */}
        <div
          aria-hidden="true"
          className="border-drawing-line-subtle col-span-12 hidden border-l pl-(--space-md) lg:col-span-4 lg:block"
        >
          <DrawingFrame className="flex h-full flex-col justify-between gap-(--space-md) p-(--space-sm)">
            {/* Keyed on the category so the crossfade replays on every change —
                the panel's one moving part that isn't a hover state. */}
            <div
              key={active.href}
              className="nav-row flex flex-col gap-(--space-2xs)"
            >
              {/* The leader proper: it leaves the position circle, crosses
                  clear sheet and lands on the part it names. */}
              <span className="flex items-center gap-(--drawing-gap)">
                <DrawingMarker filled>{activeIndex + 1}</DrawingMarker>
                <LeaderLine terminator="arrow" className="w-(--space-lg)" />
              </span>
              <p className="type-display-l text-text">
                {label(copy, active.labelKey)}
              </p>
              {active.children ? (
                <p className="type-technical-label text-text-muted">
                  {active.children
                    .map((child) => label(copy, child.labelKey))
                    .join(" / ")}
                </p>
              ) : null}
            </div>

            {/* Title-block foot: a ruled divider and the call to action. No
                counts, no price range, no hero image — none of those are known
                to the header without a query, and none of them will be
                invented to fill the frame. */}
            <div className="flex flex-col gap-(--space-2xs)">
              <TechnicalLine />
              <span className="type-nav text-text-muted inline-flex items-center gap-(--space-2xs)">
                {copy.viewCategory}
                <Arrow />
              </span>
            </div>
          </DrawingFrame>
        </div>
      </div>
    </div>
  );
}
