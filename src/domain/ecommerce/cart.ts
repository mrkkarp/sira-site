import { z } from "zod";
import { CartId, PromoCodeId } from "../shared/ids";
import { CartLineSchema } from "./cart-line";
import { CurrencyCode } from "../shared/money";

/**
 * `Cart` (Prompt 8 §2.3, §6) — server-persisted, keyed by a cookie
 * token rather than a customer account (guest checkout only, per
 * `CustomerDetails`'s doc comment). `sessionToken` is the opaque value
 * stored in the cart cookie; the cart service (Phase D) looks up the
 * `Cart` row by this token, never trusts a cart's contents or prices
 * sent from the client, and always re-validates against the DB.
 */
export const CartSchema = z.object({
  id: CartId,
  sessionToken: z.string().min(1),
  currency: CurrencyCode,
  lines: z.array(CartLineSchema),
  promoCodeId: PromoCodeId.nullable().optional(),
  createdAt: z.string().datetime(),
  updatedAt: z.string().datetime(),
  /** Carts are ephemeral — an expiry lets a cleanup job garbage-collect abandoned ones instead of keeping every cart forever. */
  expiresAt: z.string().datetime().optional(),
});
export type Cart = Readonly<z.infer<typeof CartSchema>>;
