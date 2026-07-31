import type { InfoPageContent } from "@/content/info-pages";
import { Section, Container } from "@/components/layout";

/**
 * Presentational shell for the real INFO pages (`/payment-delivery`,
 * `/returns`, `/care`). It renders long-form body prose transcribed verbatim
 * from the live-site export (`src/content/info-pages.ts`) — it invents no copy
 * of its own beyond the passed-in `title`.
 *
 * Typography/spacing mirror `contact-content.tsx` so the info pages read as
 * part of the same site: `type-h1` for the page title, `type-h2` for section
 * headings, `type-body`/`type-body-lg text-text-muted` for prose, all held to
 * a readable `max-w-2xl`/`max-w-3xl` measure.
 */
export function InfoPage({
  title,
  content,
}: {
  title: string;
  content: InfoPageContent;
}) {
  return (
    <Section spacing="xl">
      <Container>
        <header className="max-w-2xl">
          <h1 className="type-h1 text-text">{title}</h1>
        </header>

        <div className="mt-(--space-xl) flex max-w-3xl flex-col gap-(--space-lg)">
          {content.sections.map((section, index) => (
            <section key={index}>
              {section.heading ? (
                <h2 className="type-h2 text-text">{section.heading}</h2>
              ) : null}

              {section.paragraphs.map((paragraph, paragraphIndex) => (
                <p
                  key={paragraphIndex}
                  className={`type-body-lg text-text-muted ${
                    paragraphIndex === 0 && section.heading
                      ? "mt-(--space-sm)"
                      : paragraphIndex > 0
                        ? "mt-(--space-sm)"
                        : ""
                  }`}
                >
                  {paragraph}
                </p>
              ))}

              {section.bullets ? (
                <ul
                  className={`type-body text-text-muted flex list-disc flex-col gap-(--space-2xs) pl-(--space-md) ${
                    section.heading || section.paragraphs.length > 0
                      ? "mt-(--space-sm)"
                      : ""
                  }`}
                >
                  {section.bullets.map((bullet, bulletIndex) => (
                    <li key={bulletIndex}>{bullet}</li>
                  ))}
                </ul>
              ) : null}
            </section>
          ))}
        </div>
      </Container>
    </Section>
  );
}
