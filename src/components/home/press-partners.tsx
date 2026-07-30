import { pressPartners } from "@/config/homepage";
import { Section, Container, Inline } from "@/components/layout";

/**
 * "Преса або партнери" (Prompt 4 §12) — optional. No real partner/press
 * logo has been confirmed, so `pressPartners` in `src/config/homepage.ts`
 * is empty and this section renders nothing at all rather than showing
 * placeholder or invented names.
 */
export function PressPartners() {
  if (pressPartners.length === 0) return null;

  return (
    <Section tone="surface" spacing="lg">
      <Container>
        <Inline gap="md" className="justify-center opacity-70 grayscale">
          {pressPartners.map((partner) => (
            <span key={partner.name} className="type-technical-label">
              {partner.name}
            </span>
          ))}
        </Inline>
      </Container>
    </Section>
  );
}
