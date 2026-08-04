import type { Dictionary } from "@/i18n/get-dictionary";
import { Section, Container } from "@/components/layout";
import { SampleRequestForm } from "@/components/samples/sample-request-form";

/**
 * `/samples` — "Замовити зразок кольору".
 *
 * There is no swatch picker here, and that is a data decision rather than a
 * design one. Five of the six entries in `src/data/product-colours.json` are
 * flagged `demo: true` with unconfirmed RAL/NCS codes, and not one is
 * `physicalSampleAvailable`. A grid of clickable swatches would be offering to
 * post pigments nobody has confirmed exist. So the question is asked as free
 * text and `availabilityNote` says plainly that the workshop confirms what can
 * actually be sent. Swap this for a real picker the moment the palette is
 * confirmed and the flags are flipped — not before.
 *
 * A Server Component; only the form hydrates.
 */
export function SamplesContent({ dictionary }: { dictionary: Dictionary }) {
  const copy = dictionary.samplesPage;

  return (
    <Section spacing="xl">
      <Container>
        <header className="max-w-2xl">
          <p className="type-eyebrow text-text-muted">{copy.eyebrow}</p>
          <h1 className="type-h1 text-text mt-(--space-2xs)">{copy.heading}</h1>
          <p className="type-body text-text-muted mt-(--space-sm)">
            {copy.intro}
          </p>
        </header>

        <div className="mt-(--space-2xl) grid grid-cols-1 gap-(--space-2xl) lg:grid-cols-2">
          <div className="max-w-xl">
            <p className="type-body text-text border-border-strong border-t pt-(--space-sm)">
              {copy.colourNote}
            </p>
            <p className="type-body-sm text-text-muted mt-(--space-md)">
              {copy.availabilityNote}
            </p>
          </div>

          <div className="max-w-xl">
            <h2 className="type-h3 text-text">{copy.formHeading}</h2>
            <div className="mt-(--space-md)">
              <SampleRequestForm
                dictionary={dictionary}
                location="samples_page"
              />
            </div>
          </div>
        </div>
      </Container>
    </Section>
  );
}
