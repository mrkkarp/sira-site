import { z } from "zod";
import {
  ProductId,
  CategoryId,
  CollectionId,
  ColourId,
  MediaId,
  DocumentId,
} from "../shared/ids";
import { LocaleContentSchema } from "../shared/locale-content";
import { MoneySchema } from "../shared/money";
import { LeadTimeSchema } from "../shared/lead-time";
import { SEODataSchema } from "../shared/seo";
import { LegacyMetadataSchema } from "../shared/legacy";
import { ProductOptionSchema } from "./product-option";
import { ProductSpecificationSchema } from "./product-specification";
import { ProductVariantSchema } from "./product-variant";

/**
 * `Product` (Prompt 8 §2.1) — the top-level catalog entity. Mirrors
 * `src/collections/Products.ts` (Prompt 10 phase): `editorialStatus`
 * and `stockStatus` are kept as two separate enums per that same
 * explicit rule repeated in this prompt's own domain — they answer
 * "is this record publishable" and "can this be ordered right now"
 * respectively, and must never be merged into one field.
 *
 * `variants` always has at least one entry, even for a product with no
 * real option axes — a single "default" variant carries the SKU/price/
 * inventory that would otherwise live directly on `Product`, so
 * `resolveVariant()` (Phase C) has exactly one code path regardless of
 * how many variants a product has (per §7's "не створюй вкладені
 * ланцюги if для кожної моделі товару").
 */
export const EditorialStatus = z.enum([
  "draft",
  "readyForReview",
  "published",
  "scheduled",
  "archived",
  "discontinued",
]);
export type EditorialStatus = z.infer<typeof EditorialStatus>;

export const StockStatus = z.enum([
  "inStock",
  "madeToOrder",
  "availableForOrder",
  "quoteOnly",
  "unavailable",
]);
export type StockStatus = z.infer<typeof StockStatus>;

export const ProductSchema = z.object({
  id: ProductId,
  slug: z.string().min(1),
  sku: z.string().min(1),
  name: LocaleContentSchema,
  shortDescription: LocaleContentSchema.optional(),
  categoryId: CategoryId,
  collectionIds: z.array(CollectionId).optional(),
  availableColourIds: z.array(ColourId).optional(),
  mainMediaId: MediaId.nullable().optional(),
  galleryMediaIds: z.array(MediaId).optional(),
  documentIds: z.array(DocumentId).optional(),
  specifications: z.array(ProductSpecificationSchema).optional(),
  options: z.array(ProductOptionSchema).optional(),
  variants: z.array(ProductVariantSchema).min(1),
  /** Display/fallback price before a variant is selected; `null` for quote-only products with no fixed price at all. */
  basePrice: MoneySchema.nullable(),
  editorialStatus: EditorialStatus,
  stockStatus: StockStatus,
  leadTime: LeadTimeSchema.optional(),
  seo: SEODataSchema.optional(),
  legacy: LegacyMetadataSchema.optional(),
});
export type Product = Readonly<z.infer<typeof ProductSchema>>;
