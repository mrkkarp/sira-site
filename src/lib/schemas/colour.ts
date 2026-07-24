import { z } from "zod";
import { shopCategories } from "@/lib/schemas/product";

/**
 * A pigment/colour option for `/colours` and `/samples`. Concrete is coloured
 * in the mass (not surface-painted), so each entry is a real, orderable
 * finish — not a marketing palette. This is a separate model from the UI's
 * own colour tokens in `globals.css`: the UI palette exists to make the
 * *interface* look right, this model describes an actual product option a
 * customer can choose.
 *
 * `digitalPreviewHex` is only ever a screen approximation — see
 * `disclaimer`. Never treat it as proof of the physical pigment match.
 */
export const ProductColourSchema = z.object({
  slug: z.string(),
  displayName: z.string(),
  /** Screen-safe approximation only, not a colour-matching guarantee. */
  digitalPreviewHex: z.string().regex(/^#[0-9a-fA-F]{6}$/),
  /** Path to a real photo of the cured/tinted sample — required before this
   * entry can be shown as final (see IMAGE_REQUIREMENTS.md §5). */
  textureImage: z.string().optional(),
  /** RAL/NCS reference, only if actually confirmed against the workshop's
   * pigment list — omit rather than guess. */
  ralOrNcsReference: z.string().optional(),
  /** Which text colour reads legibly over this swatch/product photo. */
  textMode: z.enum(["light", "dark"]),
  /** Shop categories this colour can currently be ordered in. */
  availableCategories: z.array(z.enum(shopCategories)),
  physicalSampleAvailable: z.boolean().default(false),
  disclaimer: z.string(),
  demo: z.boolean().default(false),
});
export type ProductColour = z.infer<typeof ProductColourSchema>;
