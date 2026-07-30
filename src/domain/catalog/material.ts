import { z } from "zod";
import { MaterialId } from "../shared/ids";
import { LocaleContentSchema } from "../shared/locale-content";

/**
 * `Material` (Prompt 8 §2.1) — deliberately minimal today. The real
 * site (verified live) only ever names a material as free text inside
 * `ProductSpecification` (kind: "text", key: "material") — there is no
 * confirmed catalog of distinct material entities with their own care
 * instructions yet. This type exists so a future phase can promote
 * "material" from a spec string into a real cross-referenced entity
 * (e.g. shared care instructions across every concrete product)
 * without changing `Product`'s shape again.
 */
export const MaterialSchema = z.object({
  id: MaterialId,
  slug: z.string().min(1),
  name: LocaleContentSchema,
  description: LocaleContentSchema.optional(),
  careInstructions: LocaleContentSchema.optional(),
});
export type Material = Readonly<z.infer<typeof MaterialSchema>>;
