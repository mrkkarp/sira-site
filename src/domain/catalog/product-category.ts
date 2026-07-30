import { z } from "zod";
import { CategoryId } from "../shared/ids";
import { LocaleContentSchema } from "../shared/locale-content";
import { SEODataSchema } from "../shared/seo";
import { LegacyMetadataSchema } from "../shared/legacy";

/**
 * `ProductCategory` (Prompt 8 §2.1) — mirrors `src/collections/
 * Categories.ts` (self-referencing `parentId` for subcategories,
 * `sortOrder`, `showInMenu`, `seo`). `legacy` is optional because
 * hand-created categories (e.g. ones added directly in the admin,
 * never imported) have no Horoshop origin.
 */
export const ProductCategorySchema = z.object({
  id: CategoryId,
  slug: z.string().min(1),
  name: LocaleContentSchema,
  parentId: CategoryId.nullable().optional(),
  sortOrder: z.number().int(),
  showInMenu: z.boolean(),
  seo: SEODataSchema.optional(),
  legacy: LegacyMetadataSchema.optional(),
});
export type ProductCategory = Readonly<z.infer<typeof ProductCategorySchema>>;
