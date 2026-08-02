import { z } from "zod";

/** Digits only, so formatting choices don't affect the count. */
export function phoneDigits(value: string): string {
  return value.replace(/\D/g, "");
}

/**
 * The shortest and longest real phone numbers. E.164 caps a number at 15
 * digits including the country code; the short end is set by the smallest
 * national numbering plans still in use (Niue, Tokelau and similar sit at
 * seven, and Ukrainian numbers dialled without the country code are nine).
 */
const MIN_DIGITS = 7;
const MAX_DIGITS = 15;

/**
 * One phone rule, for the client guard *and* the API schema.
 *
 * Every lead schema used to say `z.string().min(1)`, so a single "0" was a
 * valid phone number as far as the server was concerned — and the whole
 * point of these forms is that somebody can be called back. Meanwhile the
 * warranty form's client-side guard said `z.string().trim().min(7)`. The two
 * numbers disagreed, which is the worse failure: an input the client rejects
 * with an inline message can still be perfectly acceptable to the API, and
 * an input the client waves through can come back as an opaque 400. A single
 * exported schema is the only way that stays true as forms are added.
 *
 * Deliberately permissive about *shape*. It counts digits and checks the
 * characters are ones phone numbers are actually written with; it does not
 * try to know which prefixes Ukraine has issued, and it does not reject
 * international numbers. Turning away a real customer because a regex was
 * proud of itself is a far more expensive mistake than accepting a typo that
 * a human notices when the call doesn't connect.
 */
export const PhoneNumber = z
  .string()
  .trim()
  .min(1)
  // `+` only at the front; digits, spaces, dots, hyphens and brackets
  // anywhere. Letters are the real target — "call me on viber" is a lead
  // with no way to reach it, not a phone number.
  .regex(/^\+?[\d\s().-]+$/)
  .refine((value) => {
    const digits = phoneDigits(value);
    return digits.length >= MIN_DIGITS && digits.length <= MAX_DIGITS;
  });

export type PhoneNumber = z.infer<typeof PhoneNumber>;
