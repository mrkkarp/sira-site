import type { Locale } from "@/i18n/config";
import type { Dictionary } from "@/i18n/get-dictionary";
import type { Project, ProjectContent } from "@/content/projects";
import { localeHref } from "@/lib/locale-href";
import { shopCategoryPath } from "@/lib/schemas/product-categories";
import { shopCategoryLabel } from "@/lib/shop-category-label";
import { Section, Container, MediaFrame } from "@/components/layout";
import { Breadcrumbs } from "@/components/ui/breadcrumbs";
import { LinkButton } from "@/components/ui/link-button";
import { TextLink } from "@/components/ui/text-link";
import { ProductImage } from "@/components/product/product-image";
import { CoordinateLabel, drawingIndex } from "@/components/technical-drawing";
import { BrandEyebrow } from "@/components/brand";

/**
 * `/projects/[slug]` — one realised project.
 *
 * ## What this page is for
 *
 * It is the only page on the site that answers "has this workshop done this
 * before?" — the question an architect, a landscape designer or a developer's
 * project manager asks before they ask anything about price. Nothing else can
 * answer it: the catalogue proves objects exist, `/about` states a claim about
 * public-space work, and only a photograph of a finished site proves it.
 *
 * ## The shape, and where it comes from
 *
 * The order below is the one every serious manufacturer of public-space
 * furniture converges on, for a reason worth stating: a specifier reads a case
 * study in a fixed order and gives up the moment the next thing is not there.
 *
 *   1. **Cover photograph first**, before any prose. The picture is the
 *      argument; the text explains it afterwards.
 *   2. **Fact sheet immediately under the fold** — client, place, year, type,
 *      scope. This is the block that gets read, and the block that decides
 *      whether anything below it does. Every row is optional and an absent
 *      fact renders no row: a short honest sheet beats a complete invented one
 *      on the one page whose whole job is being believed.
 *   3. **Narrative**, two or three short sections, no adjectives that a
 *      photograph already supplies.
 *   4. **The rest of the photographs**, large and uncropped.
 *   5. **Catalogue links** — the commercial engine. A reader who has just been
 *      convinced needs somewhere to go, and it must be the category, not the
 *      contact form.
 *   6. **Two CTAs.** A reader here is either specifying (wants the catalogue)
 *      or has an object no catalogue number answers (wants a conversation).
 *      One button loses whichever of the two it was not written for, and the
 *      second is the more valuable one.
 *
 * A Server Component throughout. The only client leaf is `ProductImage`, which
 * exists to swap a broken photo for text rather than the browser's broken-image
 * icon — every heading, paragraph, fact and link is in the HTML before any
 * JavaScript runs.
 */
export function ProjectDetail({
  locale,
  dictionary,
  project,
  content,
}: {
  locale: Locale;
  dictionary: Dictionary;
  project: Project;
  content: ProjectContent;
}) {
  const copy = dictionary.projectsPage;
  const [cover, ...gallery] = project.images;

  /**
   * Rows are built here rather than in the template so an unset fact produces
   * no `<div>` at all — `ProjectFacts` is all-optional by design (see
   * `src/content/projects.ts`), and a `<dt>` with an empty `<dd>` reads as
   * missing data rather than as a fact that does not apply.
   */
  const factRows: { label: string; value?: string }[] = [
    { label: copy.factLabels.client, value: content.facts.client },
    { label: copy.factLabels.location, value: project.place?.label[locale] },
    { label: copy.factLabels.year, value: project.year },
    { label: copy.factLabels.typology, value: content.facts.typology },
    { label: copy.factLabels.scope, value: content.facts.scope },
    { label: copy.factLabels.production, value: content.facts.production },
  ];
  const facts = factRows.filter(
    (row): row is { label: string; value: string } => Boolean(row.value),
  );

  return (
    <Section spacing="xl">
      <Container>
        <Breadcrumbs
          items={[
            {
              label: dictionary.shop.breadcrumbHome,
              href: localeHref(locale, "/"),
            },
            {
              label: copy.heading,
              href: localeHref(locale, "/projects"),
            },
            { label: content.title },
          ]}
        />

        <header className="mt-(--space-md) max-w-4xl">
          <BrandEyebrow>{copy.eyebrow}</BrandEyebrow>
          <h1 className="type-h1 text-text mt-(--space-2xs)">
            {content.title}
          </h1>
          <p className="type-body-lg text-text-muted mt-(--space-sm) max-w-3xl">
            {content.summary}
          </p>
        </header>

        {/* The cover runs before the fact sheet and before the prose, and it is
            the LCP element on this route — hence `priority`. Capped by height
            rather than cropped to a wider ratio: see `project-documentary` in
            `media-frame.tsx`. */}
        <MediaFrame
          ratio="project-documentary"
          maxViewportHeight="72svh"
          className="mt-(--space-lg)"
        >
          <ProductImage
            src={cover.src}
            alt={cover.alt}
            priority
            sizes="(min-width: 1600px) 1600px, 100vw"
            brokenLabel={dictionary.shop.states.brokenImageAlt}
          />
        </MediaFrame>

        <div className="mt-(--space-2xl) flex flex-col gap-(--space-2xl)">
          {facts.length > 0 ? (
            <section aria-labelledby="project-facts">
              <h2
                id="project-facts"
                className="type-eyebrow text-text-muted border-border-strong border-t pt-(--space-sm)"
              >
                {copy.factsHeading}
              </h2>
              <dl className="mt-(--space-md) grid grid-cols-1 gap-(--space-md) sm:grid-cols-2 lg:grid-cols-3">
                {facts.map((row) => (
                  <div
                    key={row.label}
                    className="border-border border-t pt-(--space-2xs)"
                  >
                    <dt className="type-caption text-text-muted">
                      {row.label}
                    </dt>
                    <dd className="type-body text-text mt-(--space-3xs)">
                      {row.value}
                    </dd>
                  </div>
                ))}
              </dl>
            </section>
          ) : null}

          {/* One construction line down the numbered sections, the same mark the
              workshop page uses for its production sequence — a case study is
              read as one run of reasoning, not as three unrelated facts. */}
          <div className="relative flex flex-col gap-(--space-xl)">
            <span
              aria-hidden="true"
              className="bg-drawing-line-subtle absolute inset-y-0 left-3 w-(--drawing-stroke)"
            />
            {content.sections.map((section, index) => (
              <section
                key={section.heading}
                className="flex items-baseline gap-(--space-sm)"
              >
                <CoordinateLabel className="bg-background relative w-6 shrink-0 py-(--space-3xs) text-center">
                  {drawingIndex(index + 1)}
                </CoordinateLabel>
                <div className="max-w-2xl">
                  <h2 className="type-h2 text-text">{section.heading}</h2>
                  {section.paragraphs.map((paragraph) => (
                    <p
                      key={paragraph}
                      className="type-body text-text-muted mt-(--space-sm)"
                    >
                      {paragraph}
                    </p>
                  ))}
                </div>
              </section>
            ))}
          </div>

          {gallery.length > 0 ? (
            <section aria-labelledby="project-gallery">
              <h2
                id="project-gallery"
                className="type-eyebrow text-text-muted border-border-strong border-t pt-(--space-sm)"
              >
                {copy.galleryHeading}
              </h2>
              {/* Two up on desktop, one up on a phone. Deliberately not a
                  lightbox or a carousel: a specifier scrolls, and every photo
                  should be in the HTML for Google Images to find. */}
              <div className="mt-(--space-md) grid grid-cols-1 gap-(--space-md) lg:grid-cols-2">
                {gallery.map((image) => (
                  <MediaFrame key={image.src} ratio="project-documentary">
                    <ProductImage
                      src={image.src}
                      alt={image.alt}
                      sizes="(min-width: 1024px) 50vw, 100vw"
                      brokenLabel={dictionary.shop.states.brokenImageAlt}
                    />
                  </MediaFrame>
                ))}
              </div>
            </section>
          ) : null}

          {project.relatedCategories.length > 0 ? (
            <section aria-labelledby="project-related" className="max-w-3xl">
              <h2 id="project-related" className="type-h2 text-text">
                {copy.relatedHeading}
              </h2>
              <p className="type-body text-text-muted mt-(--space-sm)">
                {copy.relatedNote}
              </p>
              <p className="mt-(--space-md) flex flex-wrap gap-x-(--space-md) gap-y-(--space-2xs)">
                {project.relatedCategories.map((category) => (
                  <TextLink
                    key={category}
                    variant="underlined"
                    href={localeHref(locale, shopCategoryPath(category))}
                  >
                    {shopCategoryLabel(category, dictionary)}
                  </TextLink>
                ))}
              </p>
            </section>
          ) : null}

          <section className="max-w-2xl">
            <h2 className="type-h2 text-text">{copy.ctaHeading}</h2>
            <p className="type-body text-text-muted mt-(--space-sm)">
              {copy.ctaBody}
            </p>
            <div className="mt-(--space-md) flex flex-wrap gap-(--space-sm)">
              <LinkButton href={localeHref(locale, "/contact")}>
                {copy.ctaPrimary}
              </LinkButton>
              <LinkButton variant="outline" href={localeHref(locale, "/shop")}>
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

          <p>
            <TextLink
              variant="underlined"
              href={localeHref(locale, "/projects")}
            >
              {copy.backToAll}
            </TextLink>
          </p>
        </div>
      </Container>
    </Section>
  );
}
