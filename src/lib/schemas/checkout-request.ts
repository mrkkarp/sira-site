import { z } from "zod";
import { CustomerDetailsSchema } from "@/domain/ecommerce/customer-details";
import { DeliveryMethodSchema } from "@/domain/ecommerce/delivery-method";

/**
 * Request-body validation for `POST /api/checkout` (Phase F). Unlike
 * the forms API's route-local schemas (Phase E), this reuses the real
 * domain schemas directly: `CustomerDetails`/`DeliveryMethod` describe
 * exactly the public fields a checkout form collects, with no
 * server-derived fields (like a lead's `status`/`sourcePath`) mixed
 * in — so there's no narrower "wire shape" to define separately.
 */
export const CheckoutRequestSchema = z.object({
  customer: CustomerDetailsSchema,
  deliveryMethod: DeliveryMethodSchema,
  notes: z.string().trim().max(2000).optional(),
});
export type CheckoutRequest = z.infer<typeof CheckoutRequestSchema>;
