import type { Locale } from "@/i18n/config";
import type { Dictionary } from "@/i18n/get-dictionary";
import { localeHref } from "@/lib/locale-href";
import { Section, Container } from "@/components/layout";
import { LinkButton } from "@/components/ui/link-button";
import { TextLink } from "@/components/ui/text-link";

/**
 * Separate commercial "order a physical sample" block (Prompt 4 §6). The
 * original design paired the copy with a sample photo; until that photography
 * is delivered the block renders text-only rather than a "Фото очікується"
 * placeholder.
 */
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
        <div className="max-w-2xl">
          <p className="type-eyebrow text-text-muted">{copy.eyebrow}</p>
          <h2 className="type-h1 text-text mt-(--space-xs)">{copy.heading}</h2>
          <p className="type-body text-text-muted mt-(--space-sm)">
            {copy.body}
          </p>
          <div className="mt-(--space-md) flex flex-wrap items-center gap-(--space-md)">
            <LinkButton href={localeHref(locale, "/samples")}>
              {copy.primaryCta}
            </LinkButton>
            <TextLink href={localeHref(locale, "/colours")} variant="underlined">
              {copy.secondaryCta}
            </TextLink>
          </div>
        </div>
      </Container>
    </Section>
  );
}
