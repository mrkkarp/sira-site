"use client";

import { useState } from "react";
import type { Locale } from "@/i18n/config";
import type { Dictionary } from "@/i18n/get-dictionary";
import type { ProductColour } from "@/lib/schemas/colour";
import { localeHref } from "@/lib/locale-href";
import { Section, Container, EditorialLayout } from "@/components/layout";
import { MediaFrame } from "@/components/layout/media-frame";
import { TextLink } from "@/components/ui/text-link";
import { LinkButton } from "@/components/ui/link-button";
import { Swatch } from "@/components/ui/swatch";
import { ImagePlaceholder } from "@/components/home/image-placeholder";

function hexToSoftWash(hex: string): string {
  const value = hex.replace("#", "");
  const r = parseInt(value.slice(0, 2), 16);
  const g = parseInt(value.slice(2, 4), 16);
  const b = parseInt(value.slice(4, 6), 16);
  // Deliberately low alpha — a section may *hint* at the active colour, it
  // must never fully turn pink/green/terracotta (Prompt 4 §5).
  return `rgba(${r}, ${g}, ${b}, 0.06)`;
}

/**
 * "Колір у масі" palette (Prompt 4 §5). No real per-colour product photo
 * exists yet (the source catalog only distinguishes "base grey" vs. "own
 * colour" — see `src/lib/products.ts`), so the large photo stays a stable
 * placeholder throughout; only the swatch selection, name, reference and
 * disclaimer change. Selection is click/keyboard only — hovering a swatch
 * never swaps anything, satisfying the "no photo change on hover" rule
 * trivially as well as by design.
 */
export function ColourPalette({
  colours,
  locale,
  dictionary,
}: {
  colours: ProductColour[];
  locale: Locale;
  dictionary: Dictionary;
}) {
  const copy = dictionary.home.colours;
  const [activeSlug, setActiveSlug] = useState(colours[0]?.slug);
  const active =
    colours.find((colour) => colour.slug === activeSlug) ?? colours[0];

  if (!active) return null;

  return (
    <Section
      spacing="xl"
      style={{ backgroundColor: hexToSoftWash(active.digitalPreviewHex) }}
    >
      <Container>
        <EditorialLayout
          reverse
          media={
            <MediaFrame ratio="editorial-portrait">
              <ImagePlaceholder
                label={dictionary.megaMenu.catalog.editorialImageAlt}
              />
            </MediaFrame>
          }
        >
          <p className="type-eyebrow text-text-muted">{copy.eyebrow}</p>
          <h2 className="type-display-l text-text mt-(--space-xs)">
            {copy.heading}
          </h2>
          <p className="type-body-lg text-text-muted mt-(--space-sm)">
            {copy.body}
          </p>

          <div
            className="mt-(--space-lg) flex flex-wrap gap-(--space-sm)"
            role="group"
            aria-label={copy.selectLabel}
          >
            {colours.map((colour) => (
              <Swatch
                key={colour.slug}
                colour={colour}
                selected={colour.slug === active.slug}
                onSelect={setActiveSlug}
              />
            ))}
          </div>

          <div className="mt-(--space-sm)">
            <p className="type-h4 text-text">{active.displayName}</p>
            {active.ralOrNcsReference ? (
              <p className="type-technical-label text-text-muted mt-(--space-3xs)">
                {active.ralOrNcsReference}
              </p>
            ) : null}
          </div>

          <p className="type-caption text-text-muted mt-(--space-sm) max-w-md">
            {copy.disclaimer}
          </p>

          <div className="mt-(--space-md) flex flex-wrap gap-(--space-md)">
            <LinkButton
              href={localeHref(locale, "/samples")}
              variant="primary-dark"
            >
              {copy.samplesCta}
            </LinkButton>
            <TextLink
              href={localeHref(locale, "/colours")}
              variant="underlined"
            >
              {copy.viewAllCta}
            </TextLink>
          </div>
        </EditorialLayout>
      </Container>
    </Section>
  );
}
