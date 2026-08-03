import { z } from "zod";
import {
  outdoorTypes,
  planterPlacements,
  shopCategories,
  sinkTypes,
} from "./product-categories";

/**
 * The vocabularies themselves live in `./product-categories.ts`, which imports
 * nothing — a client component that needs the list of categories (the search
 * drawer's chips) must not drag zod's runtime into the shared bundle to get
 * seven strings. They are re-exported here so this module stays the single
 * import site for everything product-shaped on the server.
 */
export {
  outdoorTypes,
  planterPlacements,
  shopCategories,
  sinkTypes,
} from "./product-categories";

export const ShopCategorySchema = z.enum(shopCategories);
export type ShopCategory = z.infer<typeof ShopCategorySchema>;

export const SinkTypeSchema = z.enum(sinkTypes);
export type SinkType = z.infer<typeof SinkTypeSchema>;

export const OutdoorTypeSchema = z.enum(outdoorTypes);
export type OutdoorType = z.infer<typeof OutdoorTypeSchema>;

export const PlanterPlacementSchema = z.enum(planterPlacements);
export type PlanterPlacement = z.infer<typeof PlanterPlacementSchema>;

/**
 * Raw source row, as exported from the Horoshop catalog (`products.source.json`).
 * This is the real, unmodified shop data — one row per colour variant.
 * Ukrainian only for now; `name`/`shortDesc`/`fullDesc` become locale-aware
 * once translated copy exists (see TODO in `src/lib/products.ts`).
 *
 * Already pre-filtered to visible rows only (Horoshop's "Отображать" /
 * "show" column was the filter used to produce this file) — there is no
 * `show` field here because every row that made it into this file is, by
 * construction, already visible. Don't re-add a `show` re-filter downstream.
 */
export const ProductSourceRowSchema = z.object({
  sku: z.string(),
  parentSku: z.string(),
  name: z.string(),
  category: z.string(),
  price: z.number().nonnegative(),
  photo: z.string(),
  /** Ordered gallery of local image paths for this row, taken from the
   * Horoshop "Галерея" export (order preserved). The first entry is the main
   * photo; falls back to `[photo]` when the export had no extra gallery. */
  gallery: z.array(z.string()).default([]),
  /** Original Horoshop offer id (Prom feed `id`) for this SKU — used to seed
   * legacy old→new redirects and to reconcile against the old catalogue.
   * Optional because not every visible row mapped to a Prom offer. */
  legacyId: z.string().optional(),
  alias: z.string(),
  shortDesc: z.string(),
  fullDesc: z.string(),
  color: z.string(),
});
export type ProductSourceRow = z.infer<typeof ProductSourceRowSchema>;

export const ProductSourceFileSchema = z.array(ProductSourceRowSchema);

/**
 * A normalised, presentation-ready product — one entry per colour-variant
 * group (the "Сірий базовий" row plus its optional custom-colour sibling).
 * This is what components/pages consume; it is derived from
 * `ProductSourceRow[]` by `src/lib/products.ts`, not authored by hand.
 */
export const ProductVariantSchema = z.object({
  /** The real per-row SKU from the source export (e.g. "Odri" vs "Odri
   * color") — a genuine, distinct identifier per colour row, not shared
   * with the product's primary `sku`. */
  sku: z.string(),
  /** The real, raw `color` label from the source row (e.g. "Сірий базовий"
   * / "Свій колір") — never invented; used to render the actual colour
   * name rather than a hardcoded "base"/"custom" string. Empty for
   * single-variant products with no colour field at all. */
  colorLabel: z.string().optional(),
  price: z.number().nonnegative(),
  photo: z.string(),
  /** Ordered gallery of **photographs** for this variant, threaded through
   * from the source row. First entry is the main photo. Optional because
   * hand-built variants (tests, ad-hoc fixtures) may omit it; the real
   * `toVariant` pipeline always populates it. Consumers must treat a missing
   * value as "just the single `photo`".
   *
   * Dimensioned technical drawings are deliberately NOT in here — see
   * `drawings`. Anything that reaches for "a picture of this product" (the
   * card thumbnail, the category tile, an editorial paragraph's image, the
   * gallery's opening frame) can therefore use `gallery` without checking. */
  gallery: z.array(z.string()).optional(),
  /** Ordered technical drawings for this variant: dimensioned elevations and
   * sections, kept apart from `gallery` because they answer a different
   * question ("how big is it", not "what does it look like"). Sourced from
   * `Media.kind === "drawing"`, which an editor sets on upload — never
   * inferred from the filename or from pixel statistics, neither of which
   * separates a line drawing from a washbasin shot on seamless white.
   *
   * The product gallery appends these after the photographs and labels them.
   * Empty/`undefined` for the many products that ship without one. */
  drawings: z.array(z.string()).optional(),
  description: z.string(),
  /** Real per-row lead time in weeks, parsed from the "Термін виготовлення -
   * N тижні." sentence — see `parseLeadTimeWeeks` in `product-mapping.ts`.
   * Not present for every row/category; `undefined` means "not stated in the
   * source", never a guessed default. Verified to genuinely differ between
   * a product's own variant rows, so this lives per-variant, not per-product. */
  leadTimeWeeks: z.number().positive().optional(),
  /** Real "may be out of stock" free-text signal — see
   * `parseMayBeOutOfStock`. `undefined` (not `false`) when the source is
   * silent — silence is not proof of "always in stock". */
  mayBeOutOfStock: z.boolean().optional(),
  /** Presentation flag for the colour selector: `true` marks a variant that
   * cannot be bought directly and must instead route the shopper to a
   * consultation/quote CTA (a custom RAL/NCS colour whose final price and
   * feasibility need confirmation). `undefined`/`false` means the variant is
   * directly orderable at its stated `price`. Never applies to the base
   * (standard) colour. Derived from the Payload variant status in
   * `payload-flat-products.ts`; defaults to "consultation" for a custom
   * colour when unspecified (see `buildVariantModel`). */
  contactRequired: z.boolean().optional(),
});
export type ProductVariant = z.infer<typeof ProductVariantSchema>;

/**
 * A single real "Характеристики" entry.
 *
 * `label` is display text and is therefore **locale-dependent**: it is the
 * verbatim Ukrainian source string when the entry came from the legacy
 * snapshot, and the translated dictionary label when it was built from
 * Payload's typed `specs` fields. So no logic may branch on `label`.
 *
 * `key` is the stable, locale-independent identifier of *which* spec this is
 * (`material`, `connection`, `mountType`…) and is what filtering must use —
 * see `getInstallationSpecEntries`. Optional because an entry parsed out of
 * the legacy free-text block can carry a source label with no counterpart in
 * the typed schema; those are displayed but not filterable by key.
 */
export const ProductSpecEntrySchema = z.object({
  key: z.string().optional(),
  label: z.string(),
  value: z.string(),
});
export type ProductSpecEntry = z.infer<typeof ProductSpecEntrySchema>;

export const ProductSchema = z.object({
  slug: z.string(),
  sku: z.string(),
  name: z.string(),
  /** Raw category string from the source export, e.g. "Раковини/Підлогові". */
  sourceCategory: z.string(),
  shopCategory: ShopCategorySchema,
  sinkType: SinkTypeSchema.optional(),
  outdoorType: OutdoorTypeSchema.optional(),
  planterPlacement: PlanterPlacementSchema.optional(),
  /** Parsed from the real "Характеристики" text block in `fullDesc` — see
   * `parseDimensionsCm` in `src/lib/product-mapping.ts`. Currently only
   * populated for sinks; omitted (not guessed) everywhere else. */
  heightCm: z.number().positive().optional(),
  widthCm: z.number().positive().optional(),
  /** Real structured specs (material, weight, diameter, mixer/connection
   * type, colour note...) parsed from `fullDesc` — see `parseSpecEntries`.
   * Empty for every category where the source has no "Характеристики"
   * heading (everything besides sinks, currently) — never fabricated. */
  specEntries: z.array(ProductSpecEntrySchema).default([]),
  base: ProductVariantSchema,
  customColour: ProductVariantSchema.optional(),
});
export type Product = z.infer<typeof ProductSchema>;
