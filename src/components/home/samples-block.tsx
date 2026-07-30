import type { Locale } from "@/i18n/config";
import type { Dictionary } from "@/i18n/get-dictionary";
import { localeHref } from "@/lib/locale-href";
import { Section, Container, EditorialLayout } from "@/components/layout";
import { MediaFrame } from "@/components/layout/media-frame";
import { LinkButton } from "@/components/ui/link-button";
import { TextLink } from "@/components/ui/text-link";
import { ImagePlaceholder } from "@/components/home/image-placeholder";

/** Separate commercial "order a physical sample" block (Prompt 4 §6). */
export function SamplesBlock({
  locale,
  dictionary,
}: {
  locale: Locale;
  dictionary: Dictionary;
}) {
  const copy = dictionary.home.samples;

  return (
    <Section tone="muted" spacing="xl">
      <Container>
        <EditorialLayout
          media={
            <MediaFrame ratio="editorial-landscape">
              <ImagePlaceholder
                label={dictionary.megaMenu.catalog.editorialImageAlt}
              />
            </MediaFrame>
          }
        >
          <p className="type-eyebrow text-text-muted">{copy.eyebrow}</p>
          <h2 className="type-h1 text-text mt-(--space-xs)">{copy.heading}</h2>
          <p className="type-body text-text-muted mt-(--space-sm)">
            {copy.body}
          </p>
          <div className="mt-(--space-md) flex flex-wrap items-center gap-(--space-md)">
            <LinkButton href={localeHref(locale, "/samples")}>
              {copy.primaryCta}
            </LinkButton>
            <TextLink
              href={localeHref(locale, "/colours")}
              variant="underlined"
            >
              {copy.secondaryCta}
            </TextLink>
          </div>
        </EditorialLayout>
      </Container>
    </Section>
  );
}
