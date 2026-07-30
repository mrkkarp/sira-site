import { z } from "zod";
import { MediaId } from "../shared/ids";
import { LocaleContentSchema } from "../shared/locale-content";

/**
 * `ProductMedia` (Prompt 8 §2.1) — a photo attached to a product or
 * variant. Distinct from `ProductDocument` (technical files): mirrors
 * the `Media` vs `Documents` Payload-collection split from the
 * previous phase, where photography and CAD/PDF files carry different
 * metadata and access rules.
 */
export const ProductMediaSchema = z.object({
  id: MediaId,
  url: z.string().min(1),
  alt: LocaleContentSchema,
  caption: LocaleContentSchema.optional(),
  width: z.number().int().positive().optional(),
  height: z.number().int().positive().optional(),
});
export type ProductMedia = Readonly<z.infer<typeof ProductMediaSchema>>;
