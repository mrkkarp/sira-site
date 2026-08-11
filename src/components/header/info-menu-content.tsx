"use client";

import type { CSSProperties } from "react";
import Link from "next/link";
import type { Locale } from "@/i18n/config";
import type { Dictionary } from "@/i18n/get-dictionary";
import { localeHref } from "@/lib/locale-href";
import { cn } from "@/lib/cn";
import { infoMenuGroups } from "@/config/navigation";
import {
  infoMenuHeading,
  infoMenuLabels,
} from "@/components/header/info-menu-labels";
import { BrandEyebrow } from "@/components/brand";

/**
 * The information plane: three short columns of the pages a buyer goes
 * looking for — delivery, care, warranty, trade terms — none of which is big
 * enough to hold a cell in the bar and all of which are the difference
 * between an inquiry and a closed tab.
 *
 * ## Why it is not a second catalogue plane
 *
 * The catalogue's panel is full-bleed, because a catalogue *is* the site and
 * earns the gesture. This one is a narrow card hung off the bar's right edge.
 * Repeating the full-width sheet for sixteen small links would spend the
 * brand's loudest move on its quietest content, and the brief is explicit:
 * when in doubt, take the more restrained option. So the only drawing marks
 * here are the two construction verticals between the columns — the same
 * `--drawing-line-subtle` rule the catalogue puts between *its* fields — and
 * nothing else. No caption: the trigger directly above already says
 * "Інформація", and `MegaMenu` puts that on the region's `aria-label`.
 *
 * ## No column headings beyond the eyebrow
 *
 * The three headings are `BrandEyebrow`, not real `h*` elements. The panel is
 * a disclosure inside a `nav` landmark, not a document section; heading tags
 * here would inject three phantom entries into the page's heading outline on
 * *every* route, which is a worse outcome for a screen-reader user than three
 * short labelled lists.
 *
 * Every href and label is reused from `src/config/footer-nav.ts`'s
 * dictionaries rather than written fresh — see `infoMenuGroups` for why that
 * matters and for the three links deliberately left out.
 */
export function InfoMenuContent({
  locale,
  dictionary,
  open,
}: {
  locale: Locale;
  dictionary: Dictionary;
  /** Drives the staggered entrance, exactly as in `CatalogMenuContent`: the
   *  class is applied only while the panel is open, so it replays on each
   *  open without a remount. */
  open: boolean;
}) {
  return (
    // `grid-cols-3` unconditionally, with no responsive step down: the panel
    // is rendered inside the header's `hidden lg:flex` nav, so it does not
    // exist below 1024px. The mobile menu renders these same groups as plain
    // stacked lists instead — see `mobile-menu.tsx`.
    <div className="grid grid-cols-3 gap-(--space-md) px-(--space-md) py-(--space-md)">
      {infoMenuGroups.map((group, index) => {
        const labels = infoMenuLabels(dictionary, group);

        return (
          <div
            key={group.headingKey}
            style={{ "--i": index } as CSSProperties}
            className={cn(
              open && "nav-row",
              // Construction verticals between the fields, never before the
              // first one — a rule against the panel's own border would paint
              // as a 2px line.
              index > 0 && "border-drawing-line-subtle border-l pl-(--space-md)",
            )}
          >
            <BrandEyebrow>{infoMenuHeading(dictionary, group)}</BrandEyebrow>
            <ul className="mt-(--space-2xs) flex flex-col">
              {group.links.map((link) => (
                <li key={link.href}>
                  <Link
                    href={localeHref(locale, link.href)}
                    className="group type-body-sm text-text-muted hover:text-text inline-flex min-h-11 items-center transition-colors duration-(--duration-normal)"
                  >
                    {/* The underline lives on an inner span so it keeps
                        hugging the text instead of dropping to the bottom of
                        the taller 44px hit box — same fix as the catalogue's
                        sub-links. */}
                    <span className="relative">
                      {labels[link.labelKey]}
                      <span
                        aria-hidden="true"
                        className="bg-text absolute inset-x-0 -bottom-(--space-3xs) h-px origin-left scale-x-0 transition-transform duration-(--duration-normal) ease-(--ease-nav) group-hover:scale-x-100 group-focus-visible:scale-x-100"
                      />
                    </span>
                  </Link>
                </li>
              ))}
            </ul>
          </div>
        );
      })}
    </div>
  );
}
