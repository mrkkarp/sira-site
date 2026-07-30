import { z } from "zod";
import { CollectionId, ProductId } from "../shared/ids";
import { LocaleContentSchema } from "../shared/locale-content";
import { SEODataSchema } from "../shared/seo";

/**
 * `Collection` (Prompt 8 §2.1) — an editorial grouping of products
 * (e.g. a design line spanning several categories), distinct from
 * `ProductCategory` (the structural taxonomy). No Payload collection
 * for this exists yet — it's introduced here as a pure type so Phase B
 * can add the matching `collections` Payload collection without a
 * second incompatible shape appearing later.
 */
export const CollectionSchema = z.object({
  id: CollectionId,
  slug: z.string().min(1),
  name: LocaleContentSchema,
  description: LocaleContentSchema.optional(),
  productIds: z.array(ProductId),
  seo: SEODataSchema.optional(),
});
export type Collection = Readonly<z.infer<typeof CollectionSchema>>;
