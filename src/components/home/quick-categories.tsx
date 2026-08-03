import type { Locale } from "@/i18n/config";
import type { Dictionary } from "@/i18n/get-dictionary";
import { quickCategories, type QuickCategoryConfig } from "@/config/homepage";
import { shopCategoryLabel } from "@/lib/shop-category-label";
import { localeHref } from "@/lib/locale-href";
import { cn } from "@/lib/cn";
import { Section, Container, Grid, SectionHeader } from "@/components/layout";
import { MediaFrame } from "@/components/layout/media-frame";
import { ProductImage } from "@/components/product/product-image";

/** Every card is a third of the desktop grid, half the tablet grid, and the
 * full width of a phone — one span for all six, hence a constant rather than a
 * lookup on the config's `size`.
 *
 * The spans used to vary with `size` (6 / 3 / 4 of 12), and the large card
 * paired `lg:col-span-6` with a 4:5 frame. Those two numbers multiply: a
 * half-width column on a 1440 px screen is 657 px, and a 4:5 frame 657 px wide
 * is 821 px tall — 109 % of a 1440×751 laptop viewport, for a *category tile*.
 * It was also upscaling, since the underlying photo is only 750 px tall. At
 * the tablet breakpoint the same card spanned all 8 columns and got worse.
 *
 * Cropping it back to a landscape frame was not an option: the catalogue is
 * overwhelmingly portrait (median 7:8), so a wide frame either throws away
 * half of every photograph or stays tall. Narrowing the column fixes the
 * height without touching the crop, and a card that is one third of the row
 * is still plainly a card. */
const cardSpan = "col-span-4 md:col-span-4 lg:col-span-4";

function categoryLabel(
  category: QuickCategoryConfig,
  dictionary: Dictionary,
): string {
  if (category.kind === "shop-category") {
    return shopCategoryLabel(category.shopCategory, dictionary);
  }
  return dictionary.home.quickCategories.customLabel;
}

/** Editorial category grid (Prompt 4 §2) — three cards per row on desktop,
 * two on tablet, a plain sequential stack on mobile (no masonry).
 *
 * All six frames are square. The card marked `large` in the config briefly
 * kept a 4:5 frame as its remaining mark of hierarchy, but with the spans
 * equalised that only produced a ragged row: a 463 px frame beside two 427 px
 * ones pushed its heading 36 px below its neighbours', which reads as a
 * misaligned grid rather than as emphasis. A feature card needs more *width*
 * to look deliberate, and giving it that is what made it 821 px tall in the
 * first place. So the row is uniform and the first card leads by being first.
 *
 * `categoryImages` maps a category `href` to the real catalog photo chosen to
 * represent it (resolved in `page.tsx` from each config entry's
 * `representativeSlug`). Any category without a resolved image — currently the
 * custom "Індивідуальні вироби" card, which has no single product — falls back
 * to the "Фото очікується" placeholder. */
export function QuickCategories({
  locale,
  dictionary,
  categoryImages = {},
}: {
  locale: Locale;
  dictionary: Dictionary;
  categoryImages?: Record<string, string>;
}) {
  const copy = dictionary.home.quickCategories;

  return (
    <Section spacing="xl">
      <Container>
        <SectionHeader eyebrow={copy.eyebrow} heading={copy.heading} />
        <Grid className="mt-(--space-lg)">
          {quickCategories.map((category) => {
            const label = categoryLabel(category, dictionary);
            const image = categoryImages[category.href];
            // Nothing here is preloaded: the hero is 86svh tall, so this
            // section starts below the fold on every desktop viewport and its
            // images would only compete with the hero's LCP.
            return (
              <a
                key={category.href}
                href={localeHref(locale, category.href)}
                className={cn(
                  "group block focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-(--color-focus)",
                  cardSpan,
                )}
              >
                {/* No wrapper between the frame and its child: `MediaFrame`
                    crops with `[&>img]:object-cover`, a direct-child selector,
                    so an intermediate div silently drops the image to
                    `object-fit: fill` — the portrait "Вазони" shot was being
                    squashed from 2:3 into a square. The frame already supplies
                    `relative`, `overflow-hidden` and a definite height. */}
                <MediaFrame
                  ratio="square"
                  // A backstop for short and landscape viewports, where a
                  // third-width card can still out-grow the screen: on a
                  // 1280×620 laptop a square card is 411 px against a 620 px
                  // viewport, and it only gets worse as the window shortens.
                  // Inert at ordinary desktop heights, where the column is the
                  // smaller of the two.
                  maxViewportHeight="70svh"
                >
                  {image ? (
                    <ProductImage
                      src={image}
                      alt={label}
                      sizes="(min-width: 1024px) 33vw, (min-width: 768px) 50vw, 100vw"
                      brokenLabel={
                        dictionary.megaMenu.catalog.editorialImageAlt
                      }
                      className="transition-transform duration-(--duration-normal) ease-(--ease-standard) group-hover:scale-[1.03]"
                    />
                  ) : (
                    // The custom "Індивідуальні вироби" card has no single
                    // representative product photo. Rather than a "Фото
                    // очікується" placeholder, it gets a deliberate dark
                    // concrete tile that reads as an intentional
                    // consultation entry point (the label sits below).
                    <div className="bg-footer h-full w-full transition-transform duration-(--duration-normal) ease-(--ease-standard) group-hover:scale-[1.03]" />
                  )}
                </MediaFrame>
                <div className="mt-(--space-xs) flex items-start justify-between gap-(--space-sm)">
                  <div>
                    <h3 className="type-h3 text-text">{label}</h3>
                    <p className="type-body-sm text-text-muted mt-(--space-3xs)">
                      {copy[category.taglineKey]}
                    </p>
                    <p className="type-body-sm text-text-muted mt-(--space-2xs)">
                      {copy[category.descriptionKey]}
                    </p>
                  </div>
                  <svg
                    aria-hidden="true"
                    viewBox="0 0 24 24"
                    className="mt-1 h-5 w-5 shrink-0 transition-transform duration-(--duration-fast) group-hover:translate-x-1"
                  >
                    <path
                      d="M5 12h14M13 6l6 6-6 6"
                      stroke="currentColor"
                      strokeWidth="1.5"
                      fill="none"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    />
                  </svg>
                </div>
              </a>
            );
          })}
        </Grid>
      </Container>
    </Section>
  );
}
