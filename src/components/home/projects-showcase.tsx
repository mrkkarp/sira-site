import Link from "next/link";
import type { Locale } from "@/i18n/config";
import type { Dictionary } from "@/i18n/get-dictionary";
import {
  getProjectContent,
  getPublishedProjects,
  projectPath,
} from "@/content/projects";
import { localeHref } from "@/lib/locale-href";
import { Section, Container, SectionHeader } from "@/components/layout";
import { MediaFrame } from "@/components/layout/media-frame";
import { TextLink } from "@/components/ui/text-link";
import { ProductImage } from "@/components/product/product-image";

/**
 * "Реалізовані проєкти" on the homepage — now driven by the real project
 * registry (`src/content/projects.ts`) rather than the empty `demoProjects`
 * array it used to read.
 *
 * ## What changed and why
 *
 * The previous version was a demo scaffold: an active-story-plus-thumbnail-rail
 * composition, `<ImagePlaceholder>` in every frame, and a "Демонстраційний
 * приклад" badge on each card. It rendered `null` because there was nothing
 * real to show. There is now, so the scaffold goes: the badge, the placeholder
 * frames and the client-side switcher are all gone, along with the `useState`
 * that powered the switcher — this is a Server Component, and every project is
 * a plain `<a>` in the HTML before any JavaScript runs. That last part is the
 * point: the old composition had no links to `/projects/[slug]` at all, so the
 * homepage passed no authority to the case studies and a crawler found them
 * only through the sitemap.
 *
 * ## Why a plain responsive grid
 *
 * One project today. A thumbnail rail needs something to switch *to*, and a
 * three-column grid holding one card advertises the emptiness. A grid that is
 * one column at n=1 and two from `md` up reads as deliberate at every count,
 * so nothing has to be rebuilt when the second project is photographed.
 *
 * Self-hides at zero projects, the same pattern `<PressPartners>` and
 * `<Testimonials>` use — a heading over nothing is worse than no section.
 */
export function ProjectsShowcase({
  locale,
  dictionary,
}: {
  locale: Locale;
  dictionary: Dictionary;
}) {
  const copy = dictionary.home.projects;

  /**
   * `flatMap` rather than `map().filter()`: a project with no written content
   * in any locale has no title to render, and dropping it here as an empty
   * array keeps the result typed as "content is present" without a type
   * predicate. `getProjectContent` already falls back to `defaultLocale`, so
   * this only skips a record nobody has written yet.
   */
  const projects = getPublishedProjects().flatMap((project) => {
    const content = getProjectContent(project, locale);
    return content ? [{ project, content }] : [];
  });

  if (projects.length === 0) return null;

  return (
    <Section spacing="xl">
      <Container>
        <SectionHeader
          eyebrow={copy.eyebrow}
          heading={copy.heading}
          action={
            <TextLink
              href={localeHref(locale, "/projects")}
              variant="underlined"
            >
              {copy.viewAllCta}
            </TextLink>
          }
        />

        <div className="mt-(--space-lg) grid grid-cols-1 gap-(--space-lg) md:grid-cols-2">
          {projects.map(({ project, content }) => {
            const [cover] = project.images;
            const meta = [project.place?.label, project.year].filter(Boolean);

            return (
              <article key={project.slug}>
                {/* One link around the whole card: a linked photo plus a
                    separately linked title is two keyboard stops and two
                    identical entries in a screen reader's links list. */}
                <Link
                  href={localeHref(locale, projectPath(project.slug))}
                  className="group block"
                >
                  <MediaFrame ratio="project-documentary">
                    <ProductImage
                      src={cover.src}
                      alt={cover.alt}
                      // Below the fold on every viewport — the hero carousel
                      // owns `priority` on this page.
                      sizes="(min-width: 768px) 50vw, 100vw"
                      brokenLabel={dictionary.shop.states.brokenImageAlt}
                    />
                  </MediaFrame>
                  <div className="mt-(--space-xs)">
                    <h3 className="type-h3 text-text transition-opacity duration-(--duration-fast) group-hover:opacity-70">
                      {content.title}
                    </h3>
                    {meta.length > 0 ? (
                      <p className="type-caption text-text-muted mt-(--space-3xs)">
                        {meta.join(" · ")}
                      </p>
                    ) : null}
                  </div>
                </Link>
              </article>
            );
          })}
        </div>
      </Container>
    </Section>
  );
}
