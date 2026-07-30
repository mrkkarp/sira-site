import { z } from "zod";

/**
 * `CustomerDetails` (Prompt 8 §2.3) — the buyer info captured at
 * checkout. Deliberately not tied to a `Users`/account concept: the
 * storefront is guest-checkout only (per §0 analysis, no customer
 * accounts exist), so this is just a value object snapshotted onto the
 * `Cart` and then frozen onto the `Order` at submit time — never a
 * foreign key to an identity table that could change after the fact.
 */
export const CustomerDetailsSchema = z.object({
  fullName: z.string().min(1),
  phone: z.string().min(1),
  email: z.string().email().optional(),
  companyName: z.string().optional(),
  notes: z.string().optional(),
});
export type CustomerDetails = Readonly<z.infer<typeof CustomerDetailsSchema>>;
