import { z } from "zod";
import { OrderId, PaymentId, PromoCodeId } from "../shared/ids";
import { OrderLineSchema } from "./order-line";
import { MoneySchema } from "../shared/money";
import { DeliveryMethodSchema } from "./delivery-method";
import { CustomerDetailsSchema } from "./customer-details";

/**
 * `OrderStatus` (Prompt 8 §11) — the lifecycle a placed order moves
 * through. `awaitingPayment` and `paid` are distinct from `pending`
 * because an order row is created before the customer ever reaches
 * LiqPay (so an abandoned/failed payment still has a record), and the
 * order service (Phase F) transitions `awaitingPayment -> paid` only
 * from the signature-verified callback handler, never from a client
 * redirect back to `/checkout/success`.
 */
export const OrderStatus = z.enum([
  "pending",
  "awaitingPayment",
  "paid",
  "processing",
  "shipped",
  "completed",
  "cancelled",
  "refunded",
  "failed",
]);
export type OrderStatus = z.infer<typeof OrderStatus>;

/**
 * `Order` (Prompt 8 §2.3, §11) — the frozen, priced result of a
 * checkout. `orderNumber` is the human-facing identifier shown to the
 * customer and staff (distinct from `id`, which is the internal
 * branded ID); it's a plain string here because its exact format
 * (sequence/date-based/etc.) is an implementation detail of the order
 * service, not a domain concern.
 */
export const OrderSchema = z.object({
  id: OrderId,
  orderNumber: z.string().min(1),
  lines: z.array(OrderLineSchema).min(1),
  subtotal: MoneySchema,
  discountTotal: MoneySchema,
  deliveryTotal: MoneySchema,
  total: MoneySchema,
  promoCodeId: PromoCodeId.nullable().optional(),
  deliveryMethod: DeliveryMethodSchema,
  customer: CustomerDetailsSchema,
  status: OrderStatus,
  paymentId: PaymentId.nullable().optional(),
  notes: z.string().optional(),
  createdAt: z.string().datetime(),
  updatedAt: z.string().datetime(),
});
export type Order = Readonly<z.infer<typeof OrderSchema>>;
