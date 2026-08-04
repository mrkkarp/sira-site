import Link from "next/link";
import type { Locale } from "@/i18n/config";
import type { Dictionary } from "@/i18n/get-dictionary";
import {
  getProjectContent,
  projectPath,
  type Project,
} from "@/content/projects";
import { localeHref } from "@/lib/locale-href";
import { Section, Container, MediaFrame } from "@/components/layout";
import { Breadcrumbs } from "@/components/ui/breadcrumbs";
import { LinkButton } from "@/components/ui/link-button";
import { TextLink } from "@/components/ui/text-link";
import { ProductImage } from "@/components/product/product-image";
import { CoordinateLabel, drawingIndex } from "@/components/technical-drawing";

/**
 * `/projects` — the index of realised projects.
 *
 * ## Why one big card per project and not a grid of thumbnails
 *
 * A grid is the right shape for a catalogue, where the reader is comparing
 * many interchangeable things and wants density. It is the wrong shape here:
 * there is exactly one project today, and a three-column grid holding one
 * small card announces the emptiness louder than anything the copy could say.
 * A full-width card with a large photograph reads as a deliberate editorial
 * choice at n=1 and still reads correctly at n=8, so nothing has to be rebuilt
 * the day a second project lands.
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
  projects,
}: {
  locale: Locale;
  dictionary: Dictionary;
  projects: Project[];
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
          <p className="type-eyebrow text-text-muted">{copy.eyebrow}</p>
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
          {projects.map((project, index) => {
            /**
             * A project with no content in any locale cannot be rendered — it
             * has no title to link. `getProjectContent` already falls back to
             * `defaultLocale`, so this only skips a record that is genuinely
             * unwritten, and it skips it silently rather than rendering a card
             * with an empty heading.
             */
            const content = getProjectContent(project, locale);
            if (!content) return null;

            const [cover] = project.images;
            const href = localeHref(locale, projectPath(project.slug));
            const meta = [project.place?.label, project.year].filter(Boolean);

            return (
              <article key={project.slug}>
                {/* The whole card is one link. A card with a linked photo and
                    a separately linked title gives a keyboard user two stops
                    to the same URL and a screen reader two identical entries
                    in its links list. */}
                <Link href={href} className="group block">
                  <MediaFrame
                    ratio="project-documentary"
                    maxViewportHeight="68svh"
                  >
                    <ProductImage
                      src={cover.src}
                      alt={cover.alt}
                      // Only the first cover is the LCP candidate; the rest
                      // are below the fold and must stay lazy, or n projects
                      // means n eager full-width photographs on first paint.
                      priority={index === 0}
                      sizes="(min-width: 1600px) 1600px, 100vw"
                      brokenLabel={dictionary.shop.states.brokenImageAlt}
                    />
                  </MediaFrame>

                  <div className="mt-(--space-md) flex items-baseline gap-(--space-sm)">
                    <CoordinateLabel className="w-6 shrink-0 text-center">
                      {drawingIndex(index + 1)}
                    </CoordinateLabel>
                    <div className="max-w-3xl">
                      {meta.length > 0 ? (
                        <p className="type-caption text-text-muted">
                          {meta.join(" · ")}
                        </p>
                      ) : null}
                      <h2 className="type-h2 text-text mt-(--space-3xs)">
                        {content.title}
                      </h2>
                      <p className="type-body text-text-muted mt-(--space-sm)">
                        {content.summary}
                      </p>
                      {/* Styled as a link, but it is not one — the anchor is
                          the card. Nesting an <a> inside an <a> is invalid
                          HTML and the browser silently unnests it. */}
                      <span className="type-body-sm text-text mt-(--space-md) inline-block underline decoration-1 underline-offset-4 transition-opacity duration-(--duration-fast) group-hover:opacity-60">
                        {copy.viewProjectCta}
                      </span>
                    </div>
                  </div>
                </Link>
              </article>
            );
          })}

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
        </div>
      </Container>
    </Section>
  );
}
