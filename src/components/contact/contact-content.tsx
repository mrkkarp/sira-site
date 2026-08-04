import type { Dictionary } from "@/i18n/get-dictionary";
import { contact } from "@/config/contact";
import { Section, Container } from "@/components/layout";
import { ContactForm } from "@/components/contact/contact-form";

/**
 * Real ODUDLAB contact page content (replaces the former `/stockists`
 * "Дилери" placeholder). Every value is read from the single source of truth
 * in `src/config/contact.ts` — the owner-confirmed details mirrored from the
 * live site's "Контактна інформація" page — so nothing here is duplicated or
 * invented. Section/field copy comes from `dictionary.contactPage` and the
 * shared `dictionary.footerNav` field labels (reused so the footer and this
 * page never drift).
 */

/** Google Maps deep-link to the owner's exact pin — a plain query URL keyed
 * by the confirmed coordinates (not an embedded/API-keyed map), so it needs
 * no API key and reveals no user data. Coordinates beat an address-string
 * search: they drop the user right on the павільйон, not a fuzzy match. */
const mapUrl = `https://www.google.com/maps/search/?api=1&query=${contact.address.coords.lat}%2C${contact.address.coords.lng}`;

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="flex flex-col gap-(--space-3xs)">
      <dt className="type-technical-label text-text-muted">{label}</dt>
      <dd className="type-body-lg text-text">{children}</dd>
    </div>
  );
}

const valueLinkClass =
  "text-text hover:text-text-muted underline decoration-border-strong decoration-1 underline-offset-4 transition-colors duration-(--duration-fast)";

export function ContactContent({ dictionary }: { dictionary: Dictionary }) {
  const copy = dictionary.contactPage;
  const fields = dictionary.footerNav;

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

        {/* `data-analytics-location`: read by `ContactLinkTracker` so a call
            placed from this page is separable from one placed from the footer.
            It sits on the grid rather than on the `Section` because `Section`
            forwards only the props it declares — and see that file for why
            this is an attribute and not a click handler. */}
        <div
          data-analytics-location="contact_page"
          className="mt-(--space-xl) grid grid-cols-1 gap-(--space-lg) md:grid-cols-2 lg:grid-cols-3"
        >
          {/* Direct contact — phone + email */}
          <div>
            <h2 className="type-h4 text-text">{copy.reachHeading}</h2>
            <dl className="mt-(--space-sm) flex flex-col gap-(--space-md)">
              <Field label={fields.phoneLabel}>
                <a href={`tel:${contact.phone.href}`} className={valueLinkClass}>
                  {contact.phone.display}
                </a>
              </Field>
              <Field label={fields.emailLabel}>
                <a href={`mailto:${contact.email}`} className={valueLinkClass}>
                  {contact.email}
                </a>
              </Field>
            </dl>
          </div>

          {/* Messengers + social */}
          <div>
            <h2 className="type-h4 text-text">{copy.messengersHeading}</h2>
            <dl className="mt-(--space-sm) flex flex-col gap-(--space-md)">
              <Field label={fields.viberLabel}>
                <a href={contact.viberHref} className={valueLinkClass}>
                  {contact.phone.display}
                </a>
              </Field>
              <Field label={fields.telegramLabel}>
                <a
                  href={contact.telegramHref}
                  className={valueLinkClass}
                  target="_blank"
                  rel="noreferrer"
                >
                  {contact.phone.display}
                </a>
              </Field>
              <Field label={copy.socialHeading}>
                <a
                  href={contact.instagram.url}
                  className={valueLinkClass}
                  target="_blank"
                  rel="noreferrer"
                >
                  {contact.instagram.handle}
                </a>
              </Field>
            </dl>
          </div>

          {/* Showroom / pickup + map */}
          <div>
            <h2 className="type-h4 text-text">{copy.visitHeading}</h2>
            <dl className="mt-(--space-sm) flex flex-col gap-(--space-md)">
              <Field label={fields.addressLabel}>
                <span className="not-italic">{contact.address.line}</span>
              </Field>
            </dl>
            <p className="type-body-sm text-text-muted mt-(--space-sm)">
              {copy.visitNote}
            </p>
            <a
              href={mapUrl}
              target="_blank"
              rel="noreferrer"
              className={`${valueLinkClass} type-nav mt-(--space-sm) inline-block`}
            >
              {copy.mapCta}
            </a>
          </div>
        </div>

        {/*
          The form sits after the direct channels, not before them. Somebody
          who wants to phone the workshop should not have to scroll past a
          form to find the number — and the number converts faster than the
          form does in this market. The form is here for the rest: people
          reading at midnight, and people whose question needs a paragraph.

          `ContactForm` is the only Client Component on this page. Everything
          above stays server-rendered, so the phone number, address and every
          heading are in the HTML before any JavaScript runs.
        */}
        <div className="mt-(--space-2xl) max-w-xl">
          <h2 className="type-h3 text-text">{dictionary.contactForm.heading}</h2>
          <p className="type-body text-text-muted mt-(--space-2xs) mb-(--space-md)">
            {dictionary.contactForm.intro}
          </p>
          <ContactForm dictionary={dictionary} />
        </div>
      </Container>
    </Section>
  );
}
