import { z } from "zod";
import { ResourceId, DocumentId } from "../shared/ids";
import { LocaleContentSchema } from "../shared/locale-content";

/** `Resource` (Prompt 8 §2.2) — a designer-facing downloadable (spec sheet, CAD library, brand guide) listed on `/resources`, referencing a `ProductDocument` for the actual file. */
export const ResourceSchema = z.object({
  id: ResourceId,
  title: LocaleContentSchema,
  description: LocaleContentSchema.optional(),
  documentId: DocumentId,
  designerOnly: z.boolean().default(false),
});
export type Resource = Readonly<z.infer<typeof ResourceSchema>>;
