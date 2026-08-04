import { z } from "zod";
import { isValidPhoneNumber } from "./phone-rule";

export { phoneDigits, isValidPhoneNumber } from "./phone-rule";

/**
 * One phone rule, for the client guard *and* the API schema.
 *
 * Every lead schema used to say `z.string().min(1)`, so a single "0" was a
 * valid phone number as far as the server was concerned — and the whole point
 * of these forms is that somebody can be called back. Meanwhile the warranty
 * form's client-side guard said `z.string().trim().min(7)`. The two numbers
 * disagreed, which is the worse failure: an input the client rejects with an
 * inline message can still be perfectly acceptable to the API, and an input the
 * client waves through can come back as an opaque 400.
 *
 * The rule itself now lives in `phone-rule.ts`, which imports nothing, so a
 * browser can ask the same question without paying for zod's runtime (see that
 * file for why that matters on `/contact`, `/designers` and `/samples`). This
 * module is the server's view of the same predicate, expressed as the schema
 * the route handlers parse with — one function, two callers, nothing to drift.
 */
export const PhoneNumber = z
  .string()
  .trim()
  .refine((value) => isValidPhoneNumber(value));

export type PhoneNumber = z.infer<typeof PhoneNumber>;
