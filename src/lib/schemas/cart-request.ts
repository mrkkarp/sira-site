import { z } from "zod";

/** Request-body validation for the `/api/cart/*` route handlers (Phase D) — kept separate from the domain schemas in `@/domain/ecommerce`, which describe the persisted `Cart`/`CartLine` shape, not the untrusted wire input a client sends. */
export const AddCartLineRequestSchema = z.object({
  slug: z.string().min(1),
  variantSku: z.string().min(1),
  quantity: z.number().int().positive().max(99).optional(),
});
export type AddCartLineRequest = z.infer<typeof AddCartLineRequestSchema>;

export const UpdateCartLineRequestSchema = z.object({
  quantity: z.number().int().min(0).max(99),
});
export type UpdateCartLineRequest = z.infer<typeof UpdateCartLineRequestSchema>;
