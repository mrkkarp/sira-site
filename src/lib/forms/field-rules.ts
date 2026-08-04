/**
 * The field checks the lead forms run in the browser, as plain predicates with
 * no dependencies.
 *
 * The obvious implementation is to reuse the route's Zod schema on the client —
 * that is what `QuoteRequestForm` and `WarrantyRequestForm` do, and it reads
 * beautifully. It also puts zod's whole runtime (~277 kB) into the page. Those
 * two forms are behind a click, so only the people who asked for them pay;
 * `/contact`, `/designers` and `/samples` render their form immediately, and
 * they are pages paid traffic lands on. `src/lib/client-bundle.test.ts` fails
 * the build over exactly this, because the same mistake once shipped unnoticed
 * for months.
 *
 * So the browser gets predicates and the server keeps the schema. The one rule
 * that genuinely must not drift between them — what counts as a phone number —
 * is a single shared function in `domain/shared/phone-rule.ts` that both sides
 * call. The rest is "is this box empty" and "does this look like an email",
 * where a disagreement costs a redundant round-trip and an inline message, not
 * a lost lead.
 */

export { isValidPhoneNumber } from "@/domain/shared/phone-rule";

/** Empty, or nothing but whitespace. */
export function isBlank(value: string): boolean {
  return value.trim().length === 0;
}

/**
 * Intentionally close to `z.string().email()` and intentionally not identical
 * to it: something before an `@`, something after it, a dot in the domain, and
 * no spaces anywhere. A stricter pattern than this rejects addresses that exist
 * — plenty of real mailboxes look wrong — and the server's own `.email()` is
 * the final word either way. This exists to catch the typo while the person is
 * still on the page, not to be the authority.
 */
export function isValidEmail(value: string): boolean {
  const trimmed = value.trim();
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(trimmed);
}

/** An optional field is valid when it is empty *or* passes the check. */
export function isBlankOr(
  value: string,
  check: (value: string) => boolean,
): boolean {
  return isBlank(value) || check(value);
}
