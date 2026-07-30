import { z } from "zod";
import { ProductId, MediaId } from "../shared/ids";
import { leadCommonFields } from "./lead-common";

/** `WarrantyRequest` (Prompt 8 §12) — a post-purchase warranty claim. `orderNumber` is a plain string (matches `Order.orderNumber`, the human-facing identifier) rather than a branded `OrderId`, since a customer types this in from memory/an invoice and it must validate even if it turns out not to match any real order (the claim still gets logged for staff to investigate). */
export const WarrantyRequestSchema = z.object({
  ...leadCommonFields,
  type: z.literal("warranty"),
  name: z.string().min(1),
  phone: z.string().min(1),
  email: z.string().email().optional(),
  orderNumber: z.string().optional(),
  productId: ProductId.optional(),
  issueDescription: z.string().min(1),
  photoIds: z.array(MediaId).optional(),
});
export type WarrantyRequest = Readonly<z.infer<typeof WarrantyRequestSchema>>;
