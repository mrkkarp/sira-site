import { z } from "zod";
import { ProductId, VariantId, MediaId, DocumentId } from "../shared/ids";
import { MoneySchema } from "../shared/money";
import { InventoryStatusSchema } from "../shared/inventory-status";
import { LeadTimeSchema } from "../shared/lead-time";
import { LocaleContentSchema } from "../shared/locale-content";
import { ProductOptionKey } from "./product-option";

/**
 * `ProductVariant` (Prompt 8 §2.1) — one concrete, orderable SKU of a
 * product. `selectedOptions` names which value each applicable
 * `ProductOptionKey` takes for this exact variant — `resolveVariant()`
 * (Phase C) matches a customer's selection against every variant's
 * `selectedOptions` to find the exact (or nearest-impossible) match.
 * `price: null` means "no fixed price" (quote-only / custom), not
 * "free" — `basePrice` on the parent `Product` is the fallback display
 * price when a variant hasn't been selected yet.
 */
export const SelectedOptionSchema = z.object({
  optionKey: ProductOptionKey,
  value: z.string().min(1),
});
export type SelectedOption = Readonly<z.infer<typeof SelectedOptionSchema>>;

export const ProductVariantSchema = z.object({
  id: VariantId,
  productId: ProductId,
  sku: z.string().min(1),
  selectedOptions: z.array(SelectedOptionSchema),
  price: MoneySchema.nullable(),
  compareAtPrice: MoneySchema.nullable().optional(),
  inventory: InventoryStatusSchema,
  leadTime: LeadTimeSchema.optional(),
  mediaIds: z.array(MediaId).optional(),
  documentIds: z.array(DocumentId).optional(),
  stockNote: LocaleContentSchema.optional(),
});
export type ProductVariant = Readonly<z.infer<typeof ProductVariantSchema>>;
