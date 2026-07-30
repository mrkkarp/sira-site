import { z } from "zod";
import { PaymentId, OrderId } from "../shared/ids";
import { MoneySchema } from "../shared/money";

/**
 * `Payment` (Prompt 8 §2.3, §9) — one payment attempt against an
 * `Order`. `provider` is a closed union (`"liqpay" | "manual"`), not a
 * free string, so a second gateway is a type-checked addition. Never
 * stores card numbers/CVV (prohibited outright — LiqPay handles card
 * data entirely on its own hosted page/widget); `rawCallbackPayload` is
 * an opaque string kept only for audit/dispute purposes and must never
 * contain card data either, since LiqPay's server-to-server callback
 * itself never includes it. `status` is only ever written by the
 * server-side, signature-verified LiqPay callback handler (Phase F) —
 * never by anything the frontend reports.
 */
export const PaymentProvider = z.enum(["liqpay", "manual"]);
export type PaymentProvider = z.infer<typeof PaymentProvider>;

export const PaymentStatus = z.enum([
  "pending",
  "success",
  "failure",
  "reversed",
  "sandbox",
]);
export type PaymentStatus = z.infer<typeof PaymentStatus>;

export const PaymentSchema = z.object({
  id: PaymentId,
  orderId: OrderId,
  provider: PaymentProvider,
  amount: MoneySchema,
  status: PaymentStatus,
  /** LiqPay's own transaction id, used to make the callback handler idempotent (a repeat callback for the same `externalId` must be a no-op, not a double-processed payment). */
  externalId: z.string().optional(),
  signatureVerified: z.boolean().default(false),
  rawCallbackPayload: z.string().optional(),
  createdAt: z.string().datetime(),
  updatedAt: z.string().datetime(),
});
export type Payment = Readonly<z.infer<typeof PaymentSchema>>;
