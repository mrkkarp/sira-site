import { z } from "zod";
import { ColourId, MediaId, CategoryId } from "../shared/ids";
import { LocaleContentSchema } from "../shared/locale-content";
import { MoneySchema } from "../shared/money";

/**
 * `Colour` (Prompt 8 §2.1) — mirrors `src/collections/Colours.ts`
 * field-for-field (digital preview is explicitly not a guarantee of
 * the physical pigment match, hence the required `disclaimer`). This
 * supersedes the storefront-only `ProductColourSchema` in
 * `src/lib/schemas/colour.ts` as the domain shape once the repository
 * layer (Phase B) starts reading colours from Payload/Postgres instead
 * of the static JSON — the two will be reconciled at that point rather
 * than left as permanent duplicates (flagged as a migration risk in
 * the §0 analysis).
 */
export const TextMode = z.enum(["dark", "light"]);
export type TextMode = z.infer<typeof TextMode>;

export const ColourSchema = z.object({
  id: ColourId,
  slug: z.string().min(1),
  displayName: LocaleContentSchema,
  digitalPreviewHex: z
    .string()
    .regex(/^#[0-9A-Fa-f]{6}$/, "Expected a 6-digit hex colour, e.g. #A6A6A6"),
  textureImageId: MediaId.nullable().optional(),
  ralOrNcsReference: z.string().optional(),
  textMode: TextMode,
  availableCategoryIds: z.array(CategoryId),
  physicalSampleAvailable: z.boolean(),
  surcharge: MoneySchema.nullable().optional(),
  disclaimer: LocaleContentSchema,
});
export type Colour = Readonly<z.infer<typeof ColourSchema>>;
