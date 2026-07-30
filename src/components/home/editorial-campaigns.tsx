import type { ReactNode } from "react";
import type { Locale } from "@/i18n/config";
import type { Dictionary } from "@/i18n/get-dictionary";
import {
  editorialCampaigns,
  type EditorialCampaignConfig,
} from "@/config/homepage";
import { localeHref } from "@/lib/locale-href";
import { cn } from "@/lib/cn";
import { Section, Container, Grid, EditorialLayout } from "@/components/layout";
import Link from "next/link";
import { MediaFrame } from "@/components/layout/media-frame";
import { TextLink } from "@/components/ui/text-link";
import { ImagePlaceholder } from "@/components/home/image-placeholder";

type CampaignCopy =
  Dictionary["home"]["campaigns"][keyof Dictionary["home"]["campaigns"]];

/** `TextLink`'s built-in variants assume a light background; dark-tone
 * campaigns render their own link instead of fighting that with overrides. */
function DarkCampaignLink({
  href,
  className,
  children,
}: {
  href: string;
  className?: string;
  children: ReactNode;
}) {
  return (
    <Link
      href={href}
      className={cn(
        "type-nav text-background/80 decoration-background/50 hover:text-background hover:decoration-background underline underline-offset-4 transition-colors duration-(--duration-fast)",
        className,
      )}
    >
      {children}
    </Link>
  );
}

/**
 * The 7 large editorial promo blocks (Prompt 4 §3). Each `layout` gets a
 * genuinely different composition — not one template restyled seven times —
 * while sharing the same typography/spacing/link treatment so the page
 * still reads as one system. Tone alternates default/surface/muted/dark so
 * the page isn't a wall of the same background colour.
 */
export function EditorialCampaigns({
  locale,
  dictionary,
}: {
  locale: Locale;
  dictionary: Dictionary;
}) {
  return (
    <>
      {editorialCampaigns.map((campaign) => (
        <Campaign
          key={campaign.copyKey}
          config={campaign}
          copy={dictionary.home.campaigns[campaign.copyKey]}
          placeholderLabel={dictionary.megaMenu.catalog.editorialImageAlt}
          locale={locale}
        />
      ))}
    </>
  );
}

function Campaign({
  config,
  copy,
  placeholderLabel,
  locale,
}: {
  config: EditorialCampaignConfig;
  copy: CampaignCopy;
  placeholderLabel: string;
  locale: Locale;
}) {
  const href = localeHref(locale, config.href);
  const isDark = config.tone === "dark";
  const textMuted = isDark ? "text-background/80" : "text-text-muted";
  const textStrong = isDark ? "text-background" : "text-text";

  switch (config.layout) {
    // Campaign 1 — one sculptural coloured product, large frame, short
    // thesis + CTA, set beside (not behind) the text.
    case "product-focus":
      return (
        <Section tone={config.tone} spacing="xl">
          <Container>
            <EditorialLayout
              media={
                <MediaFrame ratio="editorial-portrait">
                  <ImagePlaceholder label={placeholderLabel} />
                </MediaFrame>
              }
            >
              <p className={cn("type-eyebrow", textMuted)}>{copy.eyebrow}</p>
              <h2 className={cn("type-display-l mt-(--space-xs)", textStrong)}>
                {copy.heading}
              </h2>
              <p className={cn("type-body-lg mt-(--space-sm)", textMuted)}>
                {copy.body}
              </p>
              <TextLink
                href={href}
                variant="underlined"
                className="mt-(--space-md) inline-block"
              >
                {copy.cta}
              </TextLink>
            </EditorialLayout>
          </Container>
        </Section>
      );

    // Campaign 2 — large vertical photo, separate text block reversed to
    // the other side (media on the right this time).
    case "vertical-split":
      return (
        <Section tone={config.tone} spacing="xl">
          <Container>
            <EditorialLayout
              reverse
              media={
                <MediaFrame ratio="hero-portrait">
                  <ImagePlaceholder label={placeholderLabel} />
                </MediaFrame>
              }
            >
              <p className={cn("type-eyebrow", textMuted)}>{copy.eyebrow}</p>
              <h2 className={cn("type-h1 mt-(--space-xs)", textStrong)}>
                {copy.heading}
              </h2>
              <p className={cn("type-body mt-(--space-sm)", textMuted)}>
                {copy.body}
              </p>
              <TextLink
                href={href}
                variant="underlined"
                className="mt-(--space-md) inline-block"
              >
                {copy.cta}
              </TextLink>
            </EditorialLayout>
          </Container>
        </Section>
      );

    // Campaign 3 — full-bleed dark workshop frame, large white text set
    // over the image rather than beside it.
    case "dark-workshop":
      return (
        <Section tone="dark" spacing="2xl" className="relative overflow-hidden">
          <div className="absolute inset-0">
            <ImagePlaceholder label={placeholderLabel} className="opacity-40" />
          </div>
          <Container className="relative">
            <div className="max-w-2xl">
              <p className="type-eyebrow text-background/70">{copy.eyebrow}</p>
              <h2 className="type-display-l text-background mt-(--space-xs)">
                {copy.heading}
              </h2>
              <p className="type-body-lg text-background/85 mt-(--space-sm)">
                {copy.body}
              </p>
              <DarkCampaignLink
                href={href}
                className="mt-(--space-md) inline-block"
              >
                {copy.cta}
              </DarkCampaignLink>
            </div>
          </Container>
        </Section>
      );

    // Campaign 4 — full-width texture close-up, text confined to a safe
    // corner so it never sits on top of the busiest part of the crop.
    case "full-width-texture":
      return (
        <Section tone={config.tone} spacing="lg">
          <div className="relative">
            <MediaFrame ratio="project-cinematic" className="w-full">
              <ImagePlaceholder label={placeholderLabel} />
            </MediaFrame>
            <Container className="mt-(--space-sm)">
              <div className="max-w-md">
                <p className={cn("type-eyebrow", textMuted)}>{copy.eyebrow}</p>
                <h2 className={cn("type-h2 mt-(--space-2xs)", textStrong)}>
                  {copy.heading}
                </h2>
                <p className={cn("type-body mt-(--space-2xs)", textMuted)}>
                  {copy.body}
                </p>
                <TextLink
                  href={href}
                  variant="underlined"
                  className="mt-(--space-sm) inline-block"
                >
                  {copy.cta}
                </TextLink>
              </div>
            </Container>
          </div>
        </Section>
      );

    // Campaign 5 — two photos at different scale (overview + detail crop)
    // side by side, short technical description underneath.
    case "dual-scale":
      return (
        <Section tone={config.tone} spacing="xl">
          <Container>
            <Grid>
              <div className="col-span-4 md:col-span-5 lg:col-span-7">
                <MediaFrame ratio="editorial-landscape">
                  <ImagePlaceholder label={placeholderLabel} />
                </MediaFrame>
              </div>
              <div className="col-span-4 md:col-span-3 lg:col-span-5">
                <MediaFrame ratio="process-detail">
                  <ImagePlaceholder label={placeholderLabel} />
                </MediaFrame>
              </div>
            </Grid>
            <div className="mt-(--space-md) max-w-xl">
              <p className={cn("type-eyebrow", textMuted)}>{copy.eyebrow}</p>
              <h2 className={cn("type-h2 mt-(--space-2xs)", textStrong)}>
                {copy.heading}
              </h2>
              <p className={cn("type-body mt-(--space-2xs)", textMuted)}>
                {copy.body}
              </p>
              <TextLink
                href={href}
                variant="underlined"
                className="mt-(--space-sm) inline-block"
              >
                {copy.cta}
              </TextLink>
            </div>
          </Container>
        </Section>
      );

    // Campaign 6 — wide realized-space photo with a project-style caption
    // line, closer to a documentary gallery frame than a product shot.
    case "wide-urban":
      return (
        <Section tone={config.tone} spacing="xl">
          <Container>
            <MediaFrame
              ratio="project-cinematic"
              caption={copy.body}
              credit={{ location: "Київ" }}
            >
              <ImagePlaceholder label={placeholderLabel} />
            </MediaFrame>
            <div className="mt-(--space-sm) flex flex-wrap items-end justify-between gap-(--space-sm)">
              <div>
                <p className={cn("type-eyebrow", textMuted)}>{copy.eyebrow}</p>
                <h2 className={cn("type-h2 mt-(--space-2xs)", textStrong)}>
                  {copy.heading}
                </h2>
              </div>
              <TextLink href={href} variant="underlined">
                {copy.cta}
              </TextLink>
            </div>
          </Container>
        </Section>
      );

    // Campaign 7 — sketch/model next to the finished piece, ending in the
    // quote-request CTA rather than a category link.
    case "sketch-vs-object":
      return (
        <Section tone="dark" spacing="xl">
          <Container>
            <div className="max-w-2xl">
              <p className="type-eyebrow text-background/70">{copy.eyebrow}</p>
              <h2 className="type-display-l text-background mt-(--space-xs)">
                {copy.heading}
              </h2>
            </div>
            <Grid className="mt-(--space-md)">
              <div className="col-span-4 md:col-span-4 lg:col-span-6">
                <MediaFrame ratio="process-detail" fit="contain">
                  <ImagePlaceholder label={placeholderLabel} />
                </MediaFrame>
              </div>
              <div className="col-span-4 md:col-span-4 lg:col-span-6">
                <MediaFrame ratio="editorial-landscape">
                  <ImagePlaceholder label={placeholderLabel} />
                </MediaFrame>
              </div>
            </Grid>
            <p className="type-body-lg text-background/85 mt-(--space-md) max-w-xl">
              {copy.body}
            </p>
            <DarkCampaignLink
              href={href}
              className="mt-(--space-sm) inline-block"
            >
              {copy.cta}
            </DarkCampaignLink>
          </Container>
        </Section>
      );
  }
}
