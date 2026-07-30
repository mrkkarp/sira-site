import { z } from "zod";
import { OrderLineId, ProductId, VariantId, MediaId } from "../shared/ids";
import { MoneySchema } from "../shared/money";
import { LocaleContentSchema } from "../shared/locale-content";
import { CartLineOptionSchema } from "./cart-line";

/**
 * `OrderLine` (Prompt 8 §2.3, §11) — a frozen snapshot of a cart line at
 * the moment the order was placed. Deliberately duplicates `name`,
 * `sku`, `unitPrice`, and `options` rather than referencing the live
 * `Product`/`ProductVariant`, per the spec's explicit "order snapshot"
 * requirement: if a product is later renamed, re-priced, or deleted,
 * every existing order must keep showing exactly what the customer
 * actually bought and paid.
 */
export const OrderLineSchema = z.object({
  id: OrderLineId,
  productId: ProductId,
  variantId: VariantId,
  sku: z.string().min(1),
  name: LocaleContentSchema,
  mediaId: MediaId.optional(),
  quantity: z.number().int().positive(),
  unitPrice: MoneySchema,
  lineTotal: MoneySchema,
  options: z.array(CartLineOptionSchema),
});
export type OrderLine = Readonly<z.infer<typeof OrderLineSchema>>;
