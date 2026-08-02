import { z } from "zod";
import { ProductId } from "../shared/ids";
import { PhoneNumber } from "../shared/phone";
import { leadCommonFields } from "./lead-common";

/** `SampleRequest` (Prompt 8 §12) — a request for physical material/finish samples to be mailed out, hence the mandatory shipping `address` (distinct from `DeliveryMethod`, which is checkout-specific and models Nova Poshta/courier/pickup — a sample request is simpler and always postal). */
export const SampleRequestSchema = z.object({
  ...leadCommonFields,
  type: z.literal("sample"),
  name: z.string().min(1),
  phone: PhoneNumber,
  email: z.string().email().optional(),
  address: z.string().min(1),
  productIds: z.array(ProductId).min(1),
});
export type SampleRequest = Readonly<z.infer<typeof SampleRequestSchema>>;
