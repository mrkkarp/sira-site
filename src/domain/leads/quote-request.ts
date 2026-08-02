import { z } from "zod";
import { ProductId, VariantId } from "../shared/ids";
import { PhoneNumber } from "../shared/phone";
import { leadCommonFields } from "./lead-common";

/**
 * `QuoteRequest` (Prompt 8 §12) — "Запит ціни"/custom-product inquiry,
 * used both for `quoteOnly`-inventory products (per
 * `shared/inventory-status.ts`) and for bespoke/custom configurations
 * that don't map to any existing `ProductVariant`. `productId`/
 * `variantId` are optional for exactly that reason: a fully custom
 * request may not reference any existing catalog entry at all.
 */
export const QuoteRequestSchema = z.object({
  ...leadCommonFields,
  type: z.literal("quote"),
  name: z.string().min(1),
  phone: PhoneNumber,
  email: z.string().email().optional(),
  productId: ProductId.optional(),
  variantId: VariantId.optional(),
  quantity: z.number().int().positive().optional(),
  message: z.string().min(1),
});
export type QuoteRequest = Readonly<z.infer<typeof QuoteRequestSchema>>;
