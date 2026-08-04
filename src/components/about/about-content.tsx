import type { Locale } from "@/i18n/config";
import type { Dictionary } from "@/i18n/get-dictionary";
import { localeHref } from "@/lib/locale-href";
import { contact } from "@/config/contact";
import { Section, Container } from "@/components/layout";
import { LinkButton } from "@/components/ui/link-button";
import { TextLink } from "@/components/ui/text-link";
import { CoordinateLabel, drawingIndex } from "@/components/technical-drawing";

/**
 * `/about` — the workshop page, and the last stop for a visitor deciding
 * whether to trust a made-to-order purchase of 15–20k UAH from a workshop
 * they have not heard of. It is not a conversion page; it is the page that
 * makes the conversion pages believable.
 *
 * ## Why the section ids are load-bearing
 *
 * `#production` and `#materials` are not decoration. The footer's brand
 * column (`src/config/footer-nav.ts`) and the homepage's production campaign
 * (`src/config/homepage.ts`) have linked to `/about#production` and
 * `/about#materials` since before this page had any content — they resolved
 * to the top of a placeholder. `about-content.test.tsx` asserts both ids
 * exist, so removing or renaming a section breaks a test rather than quietly
 * restoring a dangling anchor.
 *
 * ## What is claimed here, and on whose authority
 *
 * Everything factual traces to something already established:
 *
 *   - **since 2015**, the team, and "large and small projects" — stated by
 *     the owner.
 *   - **full-cycle production in Kyiv, colour in the mass, RAL/NCS, hand
 *     finishing** — already claimed across the homepage (`home.aboutBrand`,
 *     `home.advantages`), so this page must agree with it rather than invent
 *     a second version of the same story.
 *   - **the polyurethane seal in 3–4 coats, the hydrophobic treatment, the
 *     12-month warranty, insured parcels, the VDNG pickup point** — all
 *     transcribed from the live site's own info pages
 *     (`src/content/info-pages.ts`, `src/config/contact.ts`).
 *
 * What is deliberately absent: team size, number of projects delivered,
 * client names, awards, floor area, a founding anecdote. None of it has been
 * confirmed, and on a page whose entire job is credibility an invented
 * number is the most expensive kind of copy there is.
 *
 * A Server Component with no client leaf: every paragraph, heading and link
 * is in the HTML before any JavaScript runs, which is the point for a page
 * meant to rank and to be read.
 */
export function AboutContent({
  locale,
  dictionary,
}: {
  locale: Locale;
  dictionary: Dictionary;
}) {
  const copy = dictionary.aboutPage;

  return (
    <Section spacing="xl">
      <Container>
        <header className="max-w-3xl">
          <p className="type-eyebrow text-text-muted">{copy.eyebrow}</p>
          <h1 className="type-h1 text-text mt-(--space-2xs)">{copy.heading}</h1>
          <p className="type-body-lg text-text-muted mt-(--space-sm)">
            {copy.intro}
          </p>
        </header>

        <div className="mt-(--space-2xl) flex flex-col gap-(--space-2xl)">
          <section className="max-w-2xl">
            <h2 className="type-h2 text-text">{copy.storyHeading}</h2>
            {copy.storyParagraphs.map((paragraph) => (
              <p
                key={paragraph}
                className="type-body text-text-muted mt-(--space-sm)"
              >
                {paragraph}
              </p>
            ))}
          </section>

          <section className="max-w-2xl">
            <h2 className="type-h2 text-text">{copy.projectsHeading}</h2>
            {copy.projectsParagraphs.map((paragraph) => (
              <p
                key={paragraph}
                className="type-body text-text-muted mt-(--space-sm)"
              >
                {paragraph}
              </p>
            ))}
          </section>

          <section className="max-w-2xl">
            <h2 className="type-h2 text-text">{copy.clientHeading}</h2>
            {copy.clientParagraphs.map((paragraph) => (
              <p
                key={paragraph}
                className="type-body text-text-muted mt-(--space-sm)"
              >
                {paragraph}
              </p>
            ))}

            <h3 className="type-h3 text-text mt-(--space-lg)">
              {copy.clientStepsHeading}
            </h3>
            <ol className="type-body text-text-muted mt-(--space-sm) flex flex-col gap-(--space-2xs)">
              {copy.clientSteps.map((step) => (
                <li
                  key={step}
                  className="border-border-strong border-t pt-(--space-2xs)"
                >
                  {step}
                </li>
              ))}
            </ol>
            <p className="type-body-sm text-text-muted mt-(--space-md)">
              {copy.clientNote}
            </p>
          </section>

          {/* The `id` the footer and the homepage have been linking at. */}
          <section
            id="production"
            className="max-w-3xl scroll-mt-(--header-stack-height)"
          >
            <h2 className="type-h2 text-text">{copy.productionHeading}</h2>
            <p className="type-body text-text-muted mt-(--space-sm) max-w-2xl">
              {copy.productionIntro}
            </p>

            {/* One construction line down the whole sequence rather than a
                rule per step: casting a piece is a single run of work, and
                seven separate borders drew it as seven unrelated facts. Same
                treatment as the homepage's production list, deliberately. */}
            <ol className="relative mt-(--space-lg) flex flex-col gap-(--space-md)">
              <span
                aria-hidden="true"
                className="bg-drawing-line-subtle absolute inset-y-0 left-3 w-(--drawing-stroke)"
              />
              {copy.productionSteps.map((step, index) => (
                <li
                  key={step.title}
                  className="flex items-baseline gap-(--space-sm)"
                >
                  <CoordinateLabel className="bg-background relative w-6 shrink-0 py-(--space-3xs) text-center">
                    {drawingIndex(index + 1)}
                  </CoordinateLabel>
                  <div className="max-w-xl">
                    <h3 className="type-body text-text">{step.title}</h3>
                    <p className="type-body text-text-muted mt-(--space-3xs)">
                      {step.body}
                    </p>
                  </div>
                </li>
              ))}
            </ol>

            <p className="type-body-sm text-text-muted mt-(--space-lg) max-w-2xl">
              {copy.productionNote}
            </p>
          </section>

          <section
            id="materials"
            className="max-w-3xl scroll-mt-(--header-stack-height)"
          >
            <h2 className="type-h2 text-text">{copy.materialsHeading}</h2>
            <p className="type-body text-text-muted mt-(--space-sm) max-w-2xl">
              {copy.materialsIntro}
            </p>

            <dl className="mt-(--space-lg) grid grid-cols-1 gap-(--space-md) sm:grid-cols-2">
              {copy.materialsItems.map((item) => (
                <div
                  key={item.title}
                  className="border-border-strong border-t pt-(--space-sm)"
                >
                  <dt className="type-body text-text">{item.title}</dt>
                  <dd className="type-body text-text-muted mt-(--space-3xs)">
                    {item.body}
                  </dd>
                </div>
              ))}
            </dl>

            <p className="type-body-sm text-text-muted mt-(--space-lg) max-w-2xl">
              {copy.materialsNote}
            </p>
            <p className="mt-(--space-sm) flex flex-wrap gap-x-(--space-md) gap-y-(--space-2xs)">
              <TextLink variant="underlined" href={localeHref(locale, "/care")}>
                {copy.materialsCareLink}
              </TextLink>
              <TextLink
                variant="underlined"
                href={localeHref(locale, "/colours")}
              >
                {copy.materialsColoursLink}
              </TextLink>
              <TextLink
                variant="underlined"
                href={localeHref(locale, "/samples")}
              >
                {copy.materialsSamplesLink}
              </TextLink>
            </p>
          </section>

          <section className="max-w-2xl">
            <h2 className="type-h2 text-text">{copy.visitHeading}</h2>
            <p className="type-body text-text-muted mt-(--space-sm)">
              {copy.visitBody}
            </p>
            {/* The address is read from the one owner-confirmed source rather
                than written into the copy, so it cannot drift from the footer
                and the contact page. */}
            <p className="type-body text-text mt-(--space-sm)">
              <span className="type-eyebrow text-text-muted block">
                {copy.visitAddressLabel}
              </span>
              {contact.address.line}
            </p>
          </section>

          <section className="max-w-2xl">
            <h2 className="type-h2 text-text">{copy.ctaHeading}</h2>
            <p className="type-body text-text-muted mt-(--space-sm)">
              {copy.ctaBody}
            </p>
            {/* Two CTAs, not one. A visitor on this page is either ready to
                look at pieces or has a project that no catalogue number
                answers; a lone "browse the catalogue" loses the second one,
                who is the more valuable of the two. */}
            <div className="mt-(--space-md) flex flex-wrap gap-(--space-sm)">
              <LinkButton href={localeHref(locale, "/shop")}>
                {copy.ctaPrimary}
              </LinkButton>
              <LinkButton
                variant="outline"
                href={localeHref(locale, "/contact")}
              >
                {copy.ctaSecondary}
              </LinkButton>
            </div>
            <p className="type-body-sm text-text-muted mt-(--space-md)">
              {copy.designersNote}{" "}
              <TextLink
                variant="underlined"
                href={localeHref(locale, "/designers")}
              >
                {copy.designersLink}
              </TextLink>
            </p>
          </section>
        </div>
      </Container>
    </Section>
  );
}
