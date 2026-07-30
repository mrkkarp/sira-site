import { z } from "zod";
import { leadCommonFields } from "./lead-common";

/** `CallbackRequest` (Prompt 8 §12) — "Замовити дзвінок", the lightest-weight form (phone number + optional preferred time), used as a low-friction CTA across the site. */
export const CallbackRequestSchema = z.object({
  ...leadCommonFields,
  type: z.literal("callback"),
  name: z.string().min(1),
  phone: z.string().min(1),
  preferredTime: z.string().optional(),
});
export type CallbackRequest = Readonly<z.infer<typeof CallbackRequestSchema>>;
