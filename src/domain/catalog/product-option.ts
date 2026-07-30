import { z } from "zod";
import { OptionId } from "../shared/ids";
import { LocaleContentSchema } from "../shared/locale-content";

/**
 * `ProductOption` (Prompt 8 §2.1) — one selectable axis on a product
 * (colour/size/material/coating/mount/faucetType/hole/overflow/
 * connection/kit/custom), matching the `optionAxes` group already
 * defined per-variant on `src/collections/Products.ts`. A product's
 * `options` array lists which axes apply and what values are valid for
 * each; `resolveVariant()` (Phase C) uses this to find the matching
 * variant and to reject impossible combinations up front instead of a
 * nested if-chain per product type.
 */
export const ProductOptionKey = z.enum([
  "colour",
  "size",
  "material",
  "coating",
  "mount",
  "faucetType",
  "hole",
  "overflow",
  "connection",
  "kit",
  "custom",
]);
export type ProductOptionKey = z.infer<typeof ProductOptionKey>;

export const ProductOptionValueSchema = z.object({
  value: z.string().min(1),
  label: LocaleContentSchema,
});
export type ProductOptionValue = Readonly<
  z.infer<typeof ProductOptionValueSchema>
>;

export const ProductOptionSchema = z.object({
  id: OptionId,
  key: ProductOptionKey,
  label: LocaleContentSchema,
  values: z.array(ProductOptionValueSchema).min(1),
});
export type ProductOption = Readonly<z.infer<typeof ProductOptionSchema>>;
