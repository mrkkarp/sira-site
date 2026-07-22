import { z } from "zod";

/**
 * A pigment/colour option for `/colours` and `/samples`. Concrete is coloured
 * in the mass (not surface-painted), so each swatch is a real, orderable
 * finish rather than a marketing palette.
 *
 * The five seeded swatches below are the brand's core accent range; `demo`
 * stays `false` for these since the colours themselves are real, but `code`
 * (RAL/NCS reference) should be confirmed against the workshop's actual
 * pigment list before this is treated as a final catalogue.
 */
export const ColourSwatchSchema = z.object({
  slug: z.string(),
  name: z.string(),
  hex: z.string().regex(/^#[0-9a-fA-F]{6}$/),
  code: z.string().optional(),
  demo: z.boolean().default(false),
});
export type ColourSwatch = z.infer<typeof ColourSwatchSchema>;
