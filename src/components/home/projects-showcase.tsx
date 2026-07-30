"use client";

import { useState } from "react";
import type { Locale } from "@/i18n/config";
import type { Dictionary } from "@/i18n/get-dictionary";
import { demoProjects } from "@/config/homepage";
import { localeHref } from "@/lib/locale-href";
import { cn } from "@/lib/cn";
import { Section, Container, Grid, SectionHeader } from "@/components/layout";
import { MediaFrame } from "@/components/layout/media-frame";
import { TextLink } from "@/components/ui/text-link";
import { Badge } from "@/components/ui/badge";
import { ImagePlaceholder } from "@/components/home/image-placeholder";

/**
 * "Реалізовані проєкти" (Prompt 4 §9) — one large active story plus a
 * thumbnail list to switch it, desktop only composition; mobile falls back
 * to plain sequential cards via `md:hidden`/`hidden md:block`. No real
 * projects are on file yet (`src/lib/schemas/project.ts`), so every entry
 * carries a visible "demo" badge rather than presenting them as real case
 * studies.
 */
export function ProjectsShowcase({
  locale,
  dictionary,
}: {
  locale: Locale;
  dictionary: Dictionary;
}) {
  const copy = dictionary.home.projects;
  const placeholder = dictionary.megaMenu.catalog.editorialImageAlt;
  const items = demoProjects.map((project, index) => ({
    ...project,
    ...copy.items[index],
  }));
  const [activeIndex, setActiveIndex] = useState(0);
  const active = items[activeIndex];

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

        {/* Desktop: one large active story + thumbnail list. */}
        <Grid className="mt-(--space-lg) hidden md:grid">
          <div className="col-span-8 lg:col-span-8">
            <MediaFrame
              ratio="project-cinematic"
              credit={{ location: active.location }}
            >
              <ImagePlaceholder label={placeholder} />
            </MediaFrame>
            <div className="mt-(--space-xs) flex items-center gap-(--space-sm)">
              <h3 className="type-h3 text-text">{active.title}</h3>
              <Badge>{copy.demoLabel}</Badge>
            </div>
          </div>
          <div className="col-span-4 flex flex-col gap-(--space-sm) lg:col-span-4">
            {items.map((project, index) => (
              <button
                key={project.slug}
                type="button"
                onClick={() => setActiveIndex(index)}
                className={cn(
                  "flex items-center gap-(--space-sm) border-l-2 pl-(--space-sm) text-left transition-colors duration-(--duration-fast)",
                  index === activeIndex
                    ? "border-text"
                    : "border-border hover:border-border-strong",
                )}
              >
                <div className="w-20 shrink-0">
                  <MediaFrame ratio="square">
                    <ImagePlaceholder label={placeholder} />
                  </MediaFrame>
                </div>
                <div>
                  <p className="type-body text-text">{project.title}</p>
                  <p className="type-caption text-text-muted">
                    {project.location}
                  </p>
                </div>
              </button>
            ))}
          </div>
        </Grid>

        {/* Mobile: plain sequential cards, no complex desktop composition. */}
        <div className="mt-(--space-lg) flex flex-col gap-(--space-lg) md:hidden">
          {items.map((project) => (
            <div key={project.slug}>
              <MediaFrame
                ratio="editorial-landscape"
                credit={{ location: project.location }}
              >
                <ImagePlaceholder label={placeholder} />
              </MediaFrame>
              <div className="mt-(--space-xs) flex items-center gap-(--space-sm)">
                <h3 className="type-h4 text-text">{project.title}</h3>
                <Badge>{copy.demoLabel}</Badge>
              </div>
            </div>
          ))}
        </div>
      </Container>
    </Section>
  );
}
