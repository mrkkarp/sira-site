import { z } from "zod";
import { CartLineId, ProductId, VariantId, MediaId } from "../shared/ids";
import { MoneySchema } from "../shared/money";
import { LocaleContentSchema } from "../shared/locale-content";
import { ProductOptionKey } from "../catalog/product-option";

/**
 * `CartLineOption` (Prompt 8 §2.3) — a display-only snapshot of a
 * selected option's label at the moment it was added to the cart. The
 * cart line always re-validates price/availability against the live
 * `ProductVariant` server-side (§7, §13's "завжди перевіряй ціну і
 * наявність на сервері"); this snapshot exists only so the cart UI can
 * render "Колір: Чорний матовий" without re-fetching the product.
 */
export const CartLineOptionSchema = z.object({
  optionKey: ProductOptionKey,
  value: z.string().min(1),
  label: LocaleContentSchema,
});
export type CartLineOption = Readonly<z.infer<typeof CartLineOptionSchema>>;

/**
 * `CartLine` (Prompt 8 §2.3) — one product/variant + quantity in a
 * `Cart`. `unitPrice` is a snapshot taken when the line was added or
 * last revalidated, not a source of truth: the cart service (Phase D)
 * always re-reads the live price from the product/variant before
 * showing a total or proceeding to checkout, per §7 and §13.
 */
export const CartLineSchema = z.object({
  id: CartLineId,
  productId: ProductId,
  variantId: VariantId,
  sku: z.string().min(1),
  name: LocaleContentSchema,
  mediaId: MediaId.optional(),
  quantity: z.number().int().positive(),
  unitPrice: MoneySchema,
  options: z.array(CartLineOptionSchema),
  addedAt: z.string().datetime(),
});
export type CartLine = Readonly<z.infer<typeof CartLineSchema>>;
