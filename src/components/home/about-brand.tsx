import type { Locale } from "@/i18n/config";
import type { Dictionary } from "@/i18n/get-dictionary";
import { localeHref } from "@/lib/locale-href";
import { Section, Container, Grid } from "@/components/layout";
import { MediaFrame } from "@/components/layout/media-frame";
import { LinkButton } from "@/components/ui/link-button";
import { ImagePlaceholder } from "@/components/home/image-placeholder";

/**
 * "Про бренд" (Prompt 4 §7) — a deliberately asymmetric split: one large
 * workshop photo, one smaller detail photo, text column with the bullet
 * list of what in-house production actually covers. No certifications,
 * years-in-business or team-size claims are invented here — only the
 * process facts the spec itself lists.
 */
export function AboutBrand({
  locale,
  dictionary,
}: {
  locale: Locale;
  dictionary: Dictionary;
}) {
  const copy = dictionary.home.aboutBrand;
  const placeholder = dictionary.megaMenu.catalog.editorialImageAlt;

  return (
    <Section spacing="xl">
      <Container>
        <Grid>
          <div className="col-span-4 md:col-span-6 lg:col-span-7">
            <MediaFrame ratio="editorial-landscape">
              <ImagePlaceholder label={placeholder} />
            </MediaFrame>
            <div className="mt-(--space-sm) max-w-xs">
              <MediaFrame ratio="square">
                <ImagePlaceholder label={placeholder} />
              </MediaFrame>
            </div>
          </div>
          <div className="col-span-4 md:col-span-8 lg:col-span-4 lg:col-start-9">
            <p className="type-eyebrow text-text-muted">{copy.eyebrow}</p>
            <h2 className="type-display-l text-text mt-(--space-xs)">
              {copy.heading}
            </h2>
            <p className="type-body-lg text-text-muted mt-(--space-sm)">
              {copy.intro}
            </p>
            <ul className="type-body text-text-muted mt-(--space-md) flex flex-col gap-(--space-xs)">
              {copy.bullets.map((bullet) => (
                <li
                  key={bullet}
                  className="border-border border-t pt-(--space-xs)"
                >
                  {bullet}
                </li>
              ))}
            </ul>
            <LinkButton
              href={localeHref(locale, "/about")}
              className="mt-(--space-md)"
            >
              {copy.cta}
            </LinkButton>
          </div>
        </Grid>
      </Container>
    </Section>
  );
}
