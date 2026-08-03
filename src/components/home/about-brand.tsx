import type { Locale } from "@/i18n/config";
import type { Dictionary } from "@/i18n/get-dictionary";
import { localeHref } from "@/lib/locale-href";
import { Section, Container } from "@/components/layout";
import { LinkButton } from "@/components/ui/link-button";
import { CoordinateLabel, drawingIndex } from "@/components/technical-drawing";

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
          <ul className="type-body text-text-muted relative mt-(--space-md) flex flex-col gap-(--space-sm)">
            {/* One construction line the whole process hangs from, rather than
                a rule per row: the steps are a single run of work, and six
                separate borders drew them as six unrelated facts. The numbers
                interrupt the line the way stations interrupt a station line. */}
            <span
              aria-hidden="true"
              className="bg-drawing-line-subtle absolute inset-y-0 left-3 w-(--drawing-stroke)"
            />
            {copy.bullets.map((bullet, index) => (
              <li key={bullet} className="flex items-baseline gap-(--space-sm)">
                <CoordinateLabel className="bg-background relative w-6 shrink-0 py-(--space-3xs) text-center">
                  {drawingIndex(index + 1)}
                </CoordinateLabel>
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
