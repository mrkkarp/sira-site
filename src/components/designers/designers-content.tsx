import type { Dictionary } from "@/i18n/get-dictionary";
import { contact } from "@/config/contact";
import { Section, Container } from "@/components/layout";
import { DesignerInquiryForm } from "@/components/designers/designer-inquiry-form";

/**
 * `/designers` — the trade page, and one of the two conversions that matter.
 *
 * Everything claimed here is something the workshop can actually do today:
 * made in Kyiv to order, dimensioned technical drawings (they exist — 17 were
 * back-filled into the catalogue), a custom colour by RAL/NCS (a real variant
 * axis on the products), a physical sample by post, and a quotation against a
 * project's volume. There is deliberately no discount percentage, no
 * commission, no lead-time promise and no "trade price list": none of those
 * have been confirmed by the owner, and a designer who specifies against an
 * invented number finds out on the quotation. `termsNote` says so in as many
 * words instead.
 *
 * A Server Component with one Client Component leaf. The phone number, the
 * heading and all four capability lines are in the HTML before any JavaScript
 * runs — which is the whole point for a page meant to rank.
 */
export function DesignersContent({ dictionary }: { dictionary: Dictionary }) {
  const copy = dictionary.designersPage;

  const offers = [
    copy.offerDrawings,
    copy.offerColour,
    copy.offerSample,
    copy.offerQuote,
  ];

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
            <h2 className="type-h3 text-text">{copy.offerHeading}</h2>
            <ul className="mt-(--space-md) flex flex-col gap-(--space-sm)">
              {offers.map((item) => (
                <li
                  key={item}
                  className="type-body text-text border-border-strong border-t pt-(--space-sm)"
                >
                  {item}
                </li>
              ))}
            </ul>
            <p className="type-body-sm text-text-muted mt-(--space-lg)">
              {copy.termsNote}
            </p>

            {/* `data-analytics-location`: `ContactLinkTracker` reads it so a
                call placed from the trade page is separable from one placed
                from the footer. An attribute rather than an onClick — see
                that component for why this file stays a Server Component. */}
            <p
              data-analytics-location="designers_page"
              className="type-body mt-(--space-md)"
            >
              <a
                href={`tel:${contact.phone.href}`}
                className="text-text hover:text-text-muted underline decoration-border-strong decoration-1 underline-offset-4 transition-colors duration-(--duration-fast)"
              >
                {contact.phone.display}
              </a>
            </p>
          </div>

          <div className="max-w-xl">
            <h2 className="type-h3 text-text">{copy.formHeading}</h2>
            <p className="type-body text-text-muted mt-(--space-2xs) mb-(--space-md)">
              {copy.formIntro}
            </p>
            <DesignerInquiryForm dictionary={dictionary} />
          </div>
        </div>
      </Container>
    </Section>
  );
}
