import type { Dictionary } from "@/i18n/get-dictionary";
import { diaryItems } from "@/config/homepage";
import { contact } from "@/config/contact";
import { cn } from "@/lib/cn";
import { Section, Container, Grid, SectionHeader } from "@/components/layout";
import { MediaFrame } from "@/components/layout/media-frame";
import { ImagePlaceholder } from "@/components/home/image-placeholder";

/**
 * "Візуальний щоденник" (Prompt 4 §13) — a curated, locally-hosted stand-in
 * for an Instagram grid. No live embed/iframe/API call is used (none of
 * those have had a permission/privacy review), just a link out to the real
 * profile. Desktop mixes a 4:5 hero frame with 1:1 tiles in an asymmetric
 * grid; mobile drops to a plain 2-column grid.
 */
export function VisualDiary({ dictionary }: { dictionary: Dictionary }) {
  const copy = dictionary.home.diary;
  const placeholder = dictionary.megaMenu.catalog.editorialImageAlt;
  const items = diaryItems.map((item, index) => ({
    ...item,
    caption: copy.items[index]?.caption ?? "",
  }));

  return (
    <Section spacing="xl">
      <Container>
        <SectionHeader
          eyebrow={copy.eyebrow}
          heading={copy.heading}
          description={copy.body}
          action={
            <a
              href={contact.instagram.url}
              target="_blank"
              rel="noreferrer"
              className="type-nav text-text-muted decoration-border-strong hover:text-text hover:decoration-text underline decoration-1 underline-offset-4"
            >
              {copy.instagramCta}
            </a>
          }
        />
        <Grid className="mt-(--space-lg)">
          {items.map((item) => (
            <div
              key={item.id}
              className={cn(
                "col-span-2 md:col-span-4",
                item.size === "large"
                  ? "lg:col-span-4 lg:row-span-2"
                  : "lg:col-span-2",
              )}
            >
              <MediaFrame
                ratio={item.size === "large" ? "editorial-portrait" : "square"}
                caption={item.caption}
              >
                <ImagePlaceholder label={placeholder} />
              </MediaFrame>
            </div>
          ))}
        </Grid>
      </Container>
    </Section>
  );
}
