import Link from "next/link";
import type { Locale } from "@/i18n/config";
import type { Dictionary } from "@/i18n/get-dictionary";
import {
  getProjectContent,
  projectPath,
  type ProjectGroup,
} from "@/content/projects";
import { localeHref } from "@/lib/locale-href";
import { Section, Container, MediaFrame } from "@/components/layout";
import { Breadcrumbs } from "@/components/ui/breadcrumbs";
import { LinkButton } from "@/components/ui/link-button";
import { TextLink } from "@/components/ui/text-link";
import { ProductImage } from "@/components/product/product-image";
import {
  CoordinateLabel,
  SectionMarker,
  TechnicalLine,
  drawingIndex,
} from "@/components/technical-drawing";
import { BrandEyebrow } from "@/components/brand";

/**
 * `/projects` — the index of realised projects.
 *
 * ## Why the page is grouped, and why it is two columns
 *
 * It used to be one column of full-bleed photographs capped at `68svh`, each
 * one sitting *above* its own title. Scrolling that page you met a picture
 * with no caption, kept going, and only then found out what it was — and with
 * two projects stacked, where one ended and the next began was genuinely
 * unreadable. The owner's words for it (2026-08-11): «око губиться, не видно
 * де проекти починаються і що це два різних».
 *
 * Three changes answer that, in order of how much they do:
 *
 * 1. **Groups with a marked heading.** Each {@link ProjectCategory} opens with
 *    a full-width rule, a `SectionMarker` and an `<h2>`. A rule across the
 *    container is the strongest "new thing starts here" signal the visual
 *    language has, and it costs no colour and no box.
 * 2. **Two columns.** A card that occupies half the width has a visible right
 *    edge, so it reads as an object rather than as a band of the page, and two
 *    projects sit side by side instead of a screen apart.
 * 3. **The photograph is inside the card, not the page.** Same 4:3 documentary
 *    frame, half the width, so the picture and the words it belongs to are
 *    within one glance of each other.
 *
 * The earlier note here argued against a grid — correctly, for the grid it was
 * arguing about: three narrow columns holding one or two thumbnails announces
 * an empty catalogue. Two columns is a different shape. Two projects fill the
 * row exactly, and at n=5 the last card sits alone in a way that reads as a
 * list continuing rather than as a gap.
 *
 * ## The empty group is rendered on purpose
 *
 * `interior` has no projects yet and still gets its heading, its standfirst and
 * a plain sentence about why there are no photographs. See
 * {@link getProjectGroups}. It must never be given a placeholder image or an
 * invented case study — the whole page's credibility rests on every photograph
 * being a real object on a real site.
 *
 * ## The card carries the facts, not just the picture
 *
 * Place and year sit on the card next to the title. They are the two things a
 * specifier scans for before deciding whether to open anything — "has this
 * workshop worked in my city, and was it recently?" — and making them click
 * through to find out costs the click. Both are locale-neutral values read
 * straight off the `Project`, so this list and the detail page's fact sheet
 * cannot disagree.
 *
 * A Server Component; `ProductImage` is the only client leaf.
 */
export function ProjectIndex({
  locale,
  dictionary,
  groups,
}: {
  locale: Locale;
  dictionary: Dictionary;
  groups: ProjectGroup[];
}) {
  const copy = dictionary.projectsPage;

  return (
    <Section spacing="xl">
      <Container>
        <Breadcrumbs
          items={[
            {
              label: dictionary.shop.breadcrumbHome,
              href: localeHref(locale, "/"),
            },
            { label: copy.heading },
          ]}
        />

        <header className="mt-(--space-md) max-w-3xl">
          <BrandEyebrow>{copy.eyebrow}</BrandEyebrow>
          <h1 className="type-h1 text-text mt-(--space-2xs)">{copy.heading}</h1>
          {copy.intro.map((paragraph) => (
            <p
              key={paragraph}
              className="type-body text-text-muted mt-(--space-sm)"
            >
              {paragraph}
            </p>
          ))}
        </header>

        <div className="mt-(--space-2xl) flex flex-col gap-(--space-2xl)">
          {groups.map((group, groupIndex) => {
            const groupCopy = copy.categories[group.category];
            const headingId = `projects-${group.category}`;

            return (
              <section key={group.category} aria-labelledby={headingId}>
                <TechnicalLine weight="line" />

                {/* Heading left, standfirst right. On a narrow screen they
                    stack, and the heading still opens the block. */}
                <div className="mt-(--space-md) grid gap-(--space-sm) lg:grid-cols-[minmax(0,1fr)_minmax(0,1.4fr)] lg:gap-(--space-lg)">
                  <div>
                    <SectionMarker index={groupIndex + 1} />
                    <h2
                      id={headingId}
                      className="type-h2 text-text mt-(--space-2xs)"
                    >
                      {groupCopy.heading}
                    </h2>
                  </div>
                  <p className="type-body text-text-muted max-w-2xl">
                    {groupCopy.intro}
                  </p>
                </div>

                {group.projects.length === 0 ? (
                  <p className="type-body-sm text-text-muted mt-(--space-lg) max-w-2xl">
                    {groupCopy.empty}
                  </p>
                ) : (
                  <div className="mt-(--space-xl) grid gap-x-(--space-lg) gap-y-(--space-xl) md:grid-cols-2">
                    {group.projects.map((project, index) => {
                      /**
                       * A project with no content in any locale cannot be
                       * rendered — it has no title to link. `getProjectContent`
                       * already falls back to `defaultLocale`, so this only
                       * skips a record that is genuinely unwritten, and it
                       * skips it silently rather than rendering a card with an
                       * empty heading.
                       */
                      const content = getProjectContent(project, locale);
                      if (!content) return null;

                      const [cover] = project.images;
                      const href = localeHref(
                        locale,
                        projectPath(project.slug),
                      );
                      const meta = [
                        project.place?.label[locale],
                        project.year,
                      ].filter(Boolean);

                      return (
                        <article key={project.slug}>
                          {/* The whole card is one link. A card with a linked
                              photo and a separately linked title gives a
                              keyboard user two stops to the same URL and a
                              screen reader two identical entries in its links
                              list. */}
                          <Link href={href} className="group block">
                            <MediaFrame ratio="project-documentary">
                              <ProductImage
                                src={cover.src}
                                alt={cover.alt}
                                // Only the very first cover on the page is the
                                // LCP candidate; the rest are below the fold
                                // and must stay lazy, or n projects means n
                                // eager photographs on first paint.
                                priority={groupIndex === 0 && index === 0}
                                sizes="(min-width: 1600px) 760px, (min-width: 768px) 50vw, 100vw"
                                brokenLabel={
                                  dictionary.shop.states.brokenImageAlt
                                }
                              />
                            </MediaFrame>

                            <div className="mt-(--space-sm) flex items-baseline gap-(--space-sm)">
                              <CoordinateLabel className="w-6 shrink-0 text-center">
                                {drawingIndex(index + 1)}
                              </CoordinateLabel>
                              <div className="min-w-0">
                                {meta.length > 0 ? (
                                  <p className="type-caption text-text-muted">
                                    {meta.join(" · ")}
                                  </p>
                                ) : null}
                                <h3 className="type-h3 text-text mt-(--space-3xs)">
                                  {content.title}
                                </h3>
                                <p className="type-body-sm text-text-muted mt-(--space-2xs)">
                                  {content.summary}
                                </p>
                                {/* Styled as a link, but it is not one — the
                                    anchor is the card. Nesting an <a> inside
                                    an <a> is invalid HTML and the browser
                                    silently unnests it. */}
                                <span className="type-body-sm text-text mt-(--space-sm) inline-block underline decoration-1 underline-offset-4 transition-opacity duration-(--duration-fast) group-hover:opacity-60">
                                  {copy.viewProjectCta}
                                </span>
                              </div>
                            </div>
                          </Link>
                        </article>
                      );
                    })}
                  </div>
                )}
              </section>
            );
          })}

          <section>
            <TechnicalLine weight="line" />
            <div className="mt-(--space-md) max-w-2xl">
              <h2 className="type-h2 text-text">{copy.ctaHeading}</h2>
              <p className="type-body text-text-muted mt-(--space-sm)">
                {copy.ctaBody}
              </p>
              <div className="mt-(--space-md) flex flex-wrap gap-(--space-sm)">
                <LinkButton href={localeHref(locale, "/contact")}>
                  {copy.ctaPrimary}
                </LinkButton>
                <LinkButton
                  variant="outline"
                  href={localeHref(locale, "/shop")}
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
            </div>
          </section>
        </div>
      </Container>
    </Section>
  );
}
