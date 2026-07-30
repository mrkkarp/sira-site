/**
 * Structural (non-translated) homepage config — hrefs, slugs, ordering,
 * media placeholders and the demo-data flags. Copy lives in
 * `dictionary.home.*`; this file only describes *shape*, mirroring the
 * convention in `src/config/navigation.ts`/`footer-nav.ts`.
 *
 * No real photography exists yet for the hero/campaigns/projects/diary
 * sections (see IMAGE_REQUIREMENTS.md — stock/AI photography is banned
 * outright, including as a placeholder). Every `image` slot below is left
 * `undefined` on purpose; components must render the shared
 * `dictionary.megaMenu.catalog.editorialImageAlt` ("Фото очікується")
 * placeholder instead of inventing a picture.
 */

export type HeroTheme = "light" | "dark";
export type HeroTextPosition = "left" | "center" | "right";

export type HeroCampaignConfig = {
  id: "workshop" | "product";
  /** Which `dictionary.home.hero[id]` copy block this campaign uses. */
  copyKey: "workshop" | "product";
  theme: HeroTheme;
  textPosition: HeroTextPosition;
  /** Real photo/video path once delivered — see IMAGE_REQUIREMENTS.md §1. */
  image?: string;
  primaryHref: string;
  secondaryHref: string;
};

export const heroCampaigns: HeroCampaignConfig[] = [
  {
    id: "workshop",
    copyKey: "workshop",
    theme: "dark",
    textPosition: "left",
    image: "/hero/hero-workshop.jpg",
    primaryHref: "/shop",
    secondaryHref: "/projects",
  },
  {
    id: "product",
    copyKey: "product",
    theme: "dark",
    textPosition: "left",
    primaryHref: "/shop",
    secondaryHref: "/projects",
  },
];

export type QuickCategoryConfig =
  | {
      kind: "shop-category";
      shopCategory: "sinks" | "planters" | "tables" | "wall-panels" | "outdoor";
      taglineKey:
        | "sinksTagline"
        | "plantersTagline"
        | "tablesTagline"
        | "wallPanelsTagline"
        | "outdoorTagline";
      /** Longer descriptive copy shown under the tagline on the card. */
      descriptionKey:
        | "sinksDescription"
        | "plantersDescription"
        | "tablesDescription"
        | "wallPanelsDescription"
        | "outdoorDescription";
      /** Slug of a real catalog product whose main photo represents this
       * category on the homepage. Resolved to an actual image path in
       * `page.tsx` via `getProductBySlug` — never a hardcoded/invented file
       * path, so it can't drift from the real product media. Falls back to
       * the "Фото очікується" placeholder if the slug ever stops resolving. */
      representativeSlug: string;
      href: string;
      /** Larger card in the asymmetric grid. */
      size: "large" | "medium" | "small";
    }
  | {
      /** "Індивідуальні вироби" isn't a real `ShopCategory` — it routes to
       * the quote-request contact flow, so it needs its own label key
       * (`home.quickCategories.customLabel`) instead of `shopCategoryLabel()`. */
      kind: "custom";
      taglineKey: "customTagline";
      descriptionKey: "customDescription";
      href: string;
      size: "large" | "medium" | "small";
    };

export const quickCategories: QuickCategoryConfig[] = [
  {
    kind: "shop-category",
    shopCategory: "sinks",
    taglineKey: "sinksTagline",
    descriptionKey: "sinksDescription",
    representativeSlug: "rakovyna-na-pidlohu-odri",
    href: "/shop/sinks",
    size: "large",
  },
  {
    kind: "shop-category",
    shopCategory: "planters",
    taglineKey: "plantersTagline",
    descriptionKey: "plantersDescription",
    representativeSlug: "flute",
    href: "/shop/planters",
    size: "medium",
  },
  {
    kind: "shop-category",
    shopCategory: "tables",
    taglineKey: "tablesTagline",
    descriptionKey: "tablesDescription",
    representativeSlug: "zhurnalnyi-stolyk-z-betonu-caiman",
    href: "/shop/tables",
    size: "medium",
  },
  {
    kind: "shop-category",
    shopCategory: "wall-panels",
    taglineKey: "wallPanelsTagline",
    descriptionKey: "wallPanelsDescription",
    representativeSlug: "riflo",
    href: "/shop/wall-panels",
    size: "small",
  },
  {
    kind: "shop-category",
    shopCategory: "outdoor",
    taglineKey: "outdoorTagline",
    descriptionKey: "outdoorDescription",
    representativeSlug: "urban-b",
    href: "/shop/outdoor",
    size: "small",
  },
  {
    kind: "custom",
    taglineKey: "customTagline",
    descriptionKey: "customDescription",
    href: "/contact",
    size: "small",
  },
];

export type CampaignLayout =
  | "product-focus"
  | "vertical-split"
  | "dark-workshop"
  | "full-width-texture"
  | "dual-scale"
  | "wide-urban"
  | "sketch-vs-object";

export type EditorialCampaignConfig = {
  /** Matches a `dictionary.home.campaigns.*` key. */
  copyKey:
    | "colouredSinks"
    | "freestanding"
    | "production"
    | "texture"
    | "wallPanels"
    | "urban"
    | "custom";
  layout: CampaignLayout;
  tone: "default" | "surface" | "muted" | "dark";
  href: string;
};

/**
 * 7 campaigns, each a distinct `layout` — deliberately not templated
 * identically (see Prompt 4 §3). Tone alternates so the page isn't a wall
 * of the same background colour.
 */
export const editorialCampaigns: EditorialCampaignConfig[] = [
  {
    copyKey: "colouredSinks",
    layout: "product-focus",
    tone: "surface",
    href: "/colours",
  },
  {
    copyKey: "freestanding",
    layout: "vertical-split",
    tone: "default",
    href: "/shop/sinks?type=freestanding",
  },
  {
    copyKey: "production",
    layout: "dark-workshop",
    tone: "dark",
    href: "/about#production",
  },
  {
    copyKey: "texture",
    layout: "full-width-texture",
    tone: "muted",
    href: "/care",
  },
  {
    copyKey: "wallPanels",
    layout: "dual-scale",
    tone: "default",
    href: "/shop/wall-panels",
  },
  {
    copyKey: "urban",
    layout: "wide-urban",
    tone: "surface",
    href: "/shop/outdoor",
  },
  {
    copyKey: "custom",
    layout: "sketch-vs-object",
    tone: "dark",
    href: "/contact",
  },
];

/**
 * Real product slugs (from `src/data/products.source.json`, verified against
 * `getAllProducts()`) picked across categories per Prompt 4 §4 — sinks,
 * planters, a table, outdoor, wall art. No invented products.
 */
export const popularProductSlugs = [
  "rakovyna-na-pidlohu-odri",
  "tower",
  "vazon-z-betonu-tsylindr-4060",
  "zhurnalnyi-stolyk-z-betonu-caiman",
  "urban-b",
  "panno-z-betonu-skolot",
  "flute",
  "odri-nakladna",
] as const;

/**
 * Colour slugs shown in the homepage palette strip, in display order —
 * reuses the real, confirmed `product-colours.json` entries (all still
 * `demo: true`/unconfirmed RAL-NCS per that file's own disclaimers).
 */
export const paletteColourSlugs = [
  "siry-bazovyi",
  "dusty-pink",
  "terracotta",
  "muted-olive",
  "industrial-blue",
  "graphite",
] as const;

/**
 * Demo project entries for the homepage "Реалізовані проєкти" teaser.
 * Mirrors `dictionary.home.projects.items` 1:1 by index (title/location
 * live in the dictionary, `demo: true` throughout — see
 * `src/lib/schemas/project.ts`: "No real projects are on file yet.").
 */
export const demoProjects = [
  { slug: "private-bathroom-kyiv", demo: true },
  { slug: "city-cafe-kyiv", demo: true },
  { slug: "residential-courtyard-kyiv", demo: true },
] as const;

/** Demo testimonials, index-aligned with `dictionary.home.testimonials.items`. */
export const demoTestimonials = [
  { id: "testimonial-1", demo: true },
  { id: "testimonial-2", demo: true },
  { id: "testimonial-3", demo: true },
] as const;

/**
 * Visual-diary items, index-aligned with `dictionary.home.diary.items`
 * (8 captions). No Instagram embed/API is wired up — these are meant to
 * become locally-hosted copies of real posts once delivered; sizes only
 * control the asymmetric grid span, `large` marks the one bigger frame.
 */
export const diaryItems = [
  { id: "diary-1", size: "large" as const },
  { id: "diary-2", size: "small" as const },
  { id: "diary-3", size: "small" as const },
  { id: "diary-4", size: "small" as const },
  { id: "diary-5", size: "small" as const },
  { id: "diary-6", size: "small" as const },
  { id: "diary-7", size: "small" as const },
  { id: "diary-8", size: "small" as const },
];

/**
 * Press/partner logos — intentionally empty. No real partner has been
 * confirmed, and the section must not render fabricated names (Prompt 4
 * §12). Populate with `{ name, logo, href? }` entries once confirmed; the
 * `<PressPartners>` component renders `null` while this stays empty.
 */
export const pressPartners: { name: string; logo: string; href?: string }[] =
  [];
