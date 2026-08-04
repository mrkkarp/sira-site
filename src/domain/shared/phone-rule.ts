/**
 * The phone rule itself, with no dependencies at all — deliberately not even
 * zod.
 *
 * `phone.ts` next door wraps this in a Zod schema for the API routes, and that
 * is the only place the schema is needed. The browser needs the *rule*: a
 * predicate that says whether what has been typed can be phoned back. Importing
 * the schema to get at that answer would drag zod's entire runtime (~277 kB) into
 * every page carrying a lead form — `/contact`, `/designers` and `/samples` are
 * three of the pages paid traffic lands on, and `src/lib/client-bundle.test.ts`
 * exists because exactly this once shipped unnoticed for months.
 *
 * Splitting the file is what keeps the two halves honest. Client and server ask
 * the same function the same question; there is no second definition to drift
 * (see `phone.ts` for what that drift cost the first time).
 */

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
 * `+` only at the front; digits, spaces, dots, hyphens and brackets anywhere.
 * Letters are the real target — "call me on viber" is a lead with no way to
 * reach it, not a phone number.
 */
const PHONE_SHAPE = /^\+?[\d\s().-]+$/;

/**
 * Deliberately permissive about *shape*. It counts digits and checks the
 * characters are ones phone numbers are actually written with; it does not try
 * to know which prefixes Ukraine has issued, and it does not reject
 * international numbers. Turning away a real customer because a regex was proud
 * of itself is a far more expensive mistake than accepting a typo that a human
 * notices when the call doesn't connect.
 */
export function isValidPhoneNumber(value: string): boolean {
  const trimmed = value.trim();
  if (trimmed.length === 0) return false;
  if (!PHONE_SHAPE.test(trimmed)) return false;
  const digits = phoneDigits(trimmed);
  return digits.length >= MIN_DIGITS && digits.length <= MAX_DIGITS;
}
