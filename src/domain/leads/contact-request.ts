import { z } from "zod";
import { PhoneNumber } from "../shared/phone";
import { leadCommonFields } from "./lead-common";

/** `ContactRequest` (Prompt 8 §12) — the general-purpose "Зв'язатися з нами" form. */
export const ContactRequestSchema = z.object({
  ...leadCommonFields,
  type: z.literal("contact"),
  name: z.string().min(1),
  phone: PhoneNumber,
  email: z.string().email().optional(),
  message: z.string().min(1),
});
export type ContactRequest = Readonly<z.infer<typeof ContactRequestSchema>>;
