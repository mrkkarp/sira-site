import { z } from "zod";

/**
 * `InventoryStatus` (Prompt 8 §2.1) — a discriminated union rather than
 * a bare enum, because "unavailable" is the one status that needs an
 * attached reason (per §7's variant-resolver requirement to "повертати
 * причину unavailable state"), and a plain `z.enum` has nowhere to put
 * that. Every other status carries no extra data. Matches
 * `stockStatus` on `src/collections/Products.ts` one-for-one so the
 * repository mapping is a direct translation, not a reinterpretation.
 */
export const InventoryStatusSchema = z.discriminatedUnion("status", [
  z.object({ status: z.literal("inStock") }),
  z.object({ status: z.literal("madeToOrder") }),
  z.object({ status: z.literal("availableForOrder") }),
  z.object({ status: z.literal("quoteOnly") }),
  z.object({ status: z.literal("unavailable"), reason: z.string().optional() }),
]);
export type InventoryStatus = Readonly<z.infer<typeof InventoryStatusSchema>>;

export function isOrderable(status: InventoryStatus): boolean {
  return (
    status.status === "inStock" ||
    status.status === "madeToOrder" ||
    status.status === "availableForOrder"
  );
}
