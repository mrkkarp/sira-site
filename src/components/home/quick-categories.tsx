import type { Locale } from "@/i18n/config";
import type { Dictionary } from "@/i18n/get-dictionary";
import { quickCategories, type QuickCategoryConfig } from "@/config/homepage";
import { shopCategoryLabel } from "@/lib/shop-category-label";
import { localeHref } from "@/lib/locale-href";
import { cn } from "@/lib/cn";
import { Section, Container, Grid, SectionHeader } from "@/components/layout";
import { MediaFrame } from "@/components/layout/media-frame";
import { ImagePlaceholder } from "@/components/home/image-placeholder";
import { ProductImage } from "@/components/product/product-image";

const spanClass: Record<QuickCategoryConfig["size"], string> = {
  large: "col-span-4 md:col-span-8 lg:col-span-6",
  medium: "col-span-4 md:col-span-4 lg:col-span-3",
  small: "col-span-4 md:col-span-4 lg:col-span-4",
};

function categoryLabel(
  category: QuickCategoryConfig,
  dictionary: Dictionary,
): string {
  if (category.kind === "shop-category") {
    return shopCategoryLabel(category.shopCategory, dictionary);
  }
  return dictionary.home.quickCategories.customLabel;
}

/** Editorial, asymmetric category grid (Prompt 4 §2) — one large card, two
 * medium, three small, laid out as a coherent 12-col grid on desktop and a
 * plain sequential stack on mobile (no masonry).
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
            const isLarge = category.size === "large";
            // The large card is the visually dominant, above-the-fold image in
            // this section, so it is the one worth preloading; the smaller
            // cards stay lazy to avoid competing with the hero LCP (see the
            // same reasoning in `popular-products.tsx`).
            return (
              <a
                key={category.href}
                href={localeHref(locale, category.href)}
                className={cn(
                  "group block focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-(--color-focus)",
                  spanClass[category.size],
                )}
              >
                <MediaFrame ratio={isLarge ? "editorial-portrait" : "square"}>
                  <div className="h-full w-full overflow-hidden">
                    {image ? (
                      <ProductImage
                        src={image}
                        alt={label}
                        sizes={
                          isLarge
                            ? "(min-width: 1024px) 50vw, 100vw"
                            : "(min-width: 1024px) 25vw, (min-width: 768px) 33vw, 100vw"
                        }
                        brokenLabel={
                          dictionary.megaMenu.catalog.editorialImageAlt
                        }
                        className="transition-transform duration-(--duration-normal) ease-(--ease-standard) group-hover:scale-[1.03]"
                      />
                    ) : (
                      <ImagePlaceholder
                        label={dictionary.megaMenu.catalog.editorialImageAlt}
                        className="transition-transform duration-(--duration-normal) ease-(--ease-standard) group-hover:scale-[1.03]"
                      />
                    )}
                  </div>
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
