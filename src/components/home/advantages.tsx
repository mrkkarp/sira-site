import type { Dictionary } from "@/i18n/get-dictionary";
import { Section, Container, Grid, SectionHeader } from "@/components/layout";

/** Calm text-only advantages list (Prompt 4 §8) — ordinal numbers and a
 * thin rule, deliberately no icon set. */
export function Advantages({ dictionary }: { dictionary: Dictionary }) {
  const copy = dictionary.home.advantages;

  return (
    <Section tone="surface" spacing="xl">
      <Container>
        <SectionHeader eyebrow={copy.eyebrow} heading={copy.heading} />
        <Grid className="mt-(--space-lg)">
          {copy.items.map((item, index) => (
            <div
              key={item.title}
              className="border-border col-span-4 border-t pt-(--space-sm) md:col-span-4 lg:col-span-4"
            >
              <p className="type-technical-label text-text-muted">
                {String(index + 1).padStart(2, "0")}
              </p>
              <h3 className="type-h4 text-text mt-(--space-xs)">
                {item.title}
              </h3>
              <p className="type-body-sm text-text-muted mt-(--space-2xs)">
                {item.body}
              </p>
            </div>
          ))}
        </Grid>
      </Container>
    </Section>
  );
}
