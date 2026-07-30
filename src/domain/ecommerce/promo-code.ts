import { z } from "zod";
import { PromoCodeId } from "../shared/ids";
import { MoneySchema } from "../shared/money";

/**
 * `PromoCode` (Prompt 8 §2.3, §13) — server-validated only, per the
 * spec's explicit rule that a promo discount must never be trusted from
 * the client. A discriminated union on `kind` because a percentage
 * discount and a fixed-amount discount need different value shapes
 * (a percentage is a bounded 0-100 number; a fixed amount is `Money`,
 * which itself carries a currency).
 */
export const PromoCodeSchema = z.object({
  id: PromoCodeId,
  code: z.string().min(1),
  discount: z.discriminatedUnion("kind", [
    z.object({
      kind: z.literal("percentage"),
      percent: z.number().min(0).max(100),
    }),
    z.object({ kind: z.literal("fixedAmount"), amount: MoneySchema }),
  ]),
  active: z.boolean().default(true),
  validFrom: z.string().datetime().optional(),
  validUntil: z.string().datetime().optional(),
  usageLimit: z.number().int().positive().optional(),
  usedCount: z.number().int().nonnegative().default(0),
  minOrderAmount: MoneySchema.optional(),
});
export type PromoCode = Readonly<z.infer<typeof PromoCodeSchema>>;
