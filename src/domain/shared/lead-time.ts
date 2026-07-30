import { z } from "zod";
import { LocaleContentSchema } from "./locale-content";

/**
 * `LeadTime` (Prompt 8 §2.1) — how long a made-to-order item takes.
 * Mirrors `leadTimeDays` on `src/collections/Products.ts` (min/max/
 * textOverride/urgentLeadTimeDays/productionCapacityStatus/
 * temporaryExtensionUntil) so the repository mapping from Payload to
 * this domain shape is a straight field-for-field copy, not a
 * reinterpretation.
 */
export const ProductionCapacityStatus = z.enum(["normal", "high", "paused"]);
export type ProductionCapacityStatus = z.infer<typeof ProductionCapacityStatus>;

export const LeadTimeSchema = z.object({
  minDays: z.number().int().nonnegative().nullable(),
  maxDays: z.number().int().nonnegative().nullable(),
  /** Free-text override shown instead of the min/max range, e.g. "за домовленістю". */
  textOverride: LocaleContentSchema.optional(),
  urgentDays: z.number().int().nonnegative().nullable().optional(),
  productionCapacityStatus: ProductionCapacityStatus.optional(),
  /** Temporary lead-time extension (e.g. seasonal load) is in effect until this date. */
  temporaryExtensionUntil: z.string().datetime().optional(),
});
export type LeadTime = Readonly<z.infer<typeof LeadTimeSchema>>;
