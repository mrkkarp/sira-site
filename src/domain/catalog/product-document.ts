import { z } from "zod";
import { DocumentId } from "../shared/ids";

/**
 * `ProductDocument` (Prompt 8 §2.1) — mirrors `src/collections/
 * Documents.ts` one-for-one (same `format` options, same visibility
 * tiers), since that Payload collection is this domain entity's
 * eventual storage. `visibility` is enforced again at the repository
 * layer (Phase B) — this schema only describes the shape, it doesn't
 * itself gate access.
 */
export const ProductDocumentFormat = z.enum([
  "pdf",
  "dwg",
  "dxf",
  "skp",
  "obj",
  "stl",
  "bim",
  "installInstructions",
  "careInstructions",
  "warranty",
  "spec",
  "dimensionalDrawing",
]);
export type ProductDocumentFormat = z.infer<typeof ProductDocumentFormat>;

export const ProductDocumentLanguage = z.enum(["uk", "en", "pl"]);
export type ProductDocumentLanguage = z.infer<typeof ProductDocumentLanguage>;

export const ProductDocumentVisibility = z.enum([
  "public",
  "private",
  "designerOnly",
]);
export type ProductDocumentVisibility = z.infer<
  typeof ProductDocumentVisibility
>;

export const ProductDocumentSchema = z.object({
  id: DocumentId,
  name: z.string().min(1),
  format: ProductDocumentFormat,
  language: ProductDocumentLanguage.optional(),
  version: z.string().optional(),
  documentDate: z.string().datetime().optional(),
  url: z.string().min(1),
  visibility: ProductDocumentVisibility,
});
export type ProductDocument = Readonly<z.infer<typeof ProductDocumentSchema>>;
