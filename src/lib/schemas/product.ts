import { z } from "zod";

/**
 * Top-level shop categories — these map 1:1 to the `/shop/[category]` routes.
 */
export const shopCategories = [
  "sinks",
  "planters",
  "tables",
  "wall-modules",
  "wall-panels",
  "wall-art",
  "outdoor",
] as const;
export const ShopCategorySchema = z.enum(shopCategories);
export type ShopCategory = z.infer<typeof ShopCategorySchema>;

/** Sink mounting type — only meaningful when category is "sinks". */
export const sinkTypes = [
  "freestanding",
  "countertop",
  "wall-mounted",
] as const;
export const SinkTypeSchema = z.enum(sinkTypes);
export type SinkType = z.infer<typeof SinkTypeSchema>;

/** Outdoor product type — only meaningful when category is "outdoor". */
export const outdoorTypes = ["bench", "bin", "tree-grate", "bollard"] as const;
export const OutdoorTypeSchema = z.enum(outdoorTypes);
export type OutdoorType = z.infer<typeof OutdoorTypeSchema>;

/**
 * Raw source row, as exported from the Horoshop catalog (`products.source.json`).
 * This is the real, unmodified shop data — one row per colour variant.
 * Ukrainian only for now; `name`/`shortDesc`/`fullDesc` become locale-aware
 * once translated copy exists (see TODO in `src/lib/products.ts`).
 */
export const ProductSourceRowSchema = z.object({
  sku: z.string(),
  parentSku: z.string(),
  name: z.string(),
  category: z.string(),
  price: z.number().nonnegative(),
  photo: z.string(),
  alias: z.string(),
  shortDesc: z.string(),
  fullDesc: z.string(),
  color: z.string(),
  show: z.string(),
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
  price: z.number().nonnegative(),
  photo: z.string(),
  description: z.string(),
});
export type ProductVariant = z.infer<typeof ProductVariantSchema>;

export const ProductSchema = z.object({
  slug: z.string(),
  sku: z.string(),
  name: z.string(),
  /** Raw category string from the source export, e.g. "Раковини/Підлогові". */
  sourceCategory: z.string(),
  shopCategory: ShopCategorySchema,
  sinkType: SinkTypeSchema.optional(),
  outdoorType: OutdoorTypeSchema.optional(),
  base: ProductVariantSchema,
  customColour: ProductVariantSchema.optional(),
});
export type Product = z.infer<typeof ProductSchema>;
