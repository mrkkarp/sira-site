import type { Locale } from "@/i18n/config";
import type { Dictionary } from "@/i18n/get-dictionary";
import { localeHref } from "@/lib/locale-href";
import { Section, Container } from "@/components/layout";
import { LinkButton } from "@/components/ui/link-button";

/**
 * "Про бренд" (Prompt 4 §7) — the in-house-production story. The original
 * design paired this with a large workshop photo and a detail crop, but that
 * photography has not been delivered; rather than show "Фото очікується"
 * placeholders, the section renders as a single text column until real images
 * exist (re-introduce the asymmetric media split then). No certifications,
 * years-in-business or team-size claims are invented — only the process facts
 * the spec itself lists.
 */
export function AboutBrand({
  locale,
  dictionary,
}: {
  locale: Locale;
  dictionary: Dictionary;
}) {
  const copy = dictionary.home.aboutBrand;

  return (
    <Section spacing="xl">
      <Container>
        <div className="max-w-3xl">
          <p className="type-eyebrow text-text-muted">{copy.eyebrow}</p>
          <h2 className="type-display-l text-text mt-(--space-xs)">
            {copy.heading}
          </h2>
          <p className="type-body-lg text-text-muted mt-(--space-sm)">
            {copy.intro}
          </p>
          <ul className="type-body text-text-muted mt-(--space-md) flex flex-col gap-(--space-xs)">
            {copy.bullets.map((bullet) => (
              <li key={bullet} className="border-border border-t pt-(--space-xs)">
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
      </Container>
    </Section>
  );
}
