/**
 * The currency vocabulary and the one conversion that is pure arithmetic —
 * in a module that imports nothing.
 *
 * `moneyToDecimal` divides by a constant. It lived in `./money.ts` alongside
 * the `Money` schema, which meant the order-status page — which renders a
 * handful of totals and validates nothing — pulled zod's entire runtime into
 * the browser to perform a division. Same shape of mistake as
 * `lib/schemas/product-categories.ts` was extracted to fix, and
 * `client-bundle.test.ts` is what now catches both.
 *
 * The direction of the dependency is the point: `money.ts` builds its zod enum
 * *from* `currencyCodes` here, so there is still exactly one list of supported
 * currencies and adding one stays a one-line, type-checked change.
 */

/**
 * Only UAH is supported today — this matches `pricing.currency` being
 * fixed/read-only in `src/collections/Products.ts`. Deliberately a
 * single-value union rather than `string`, so a second currency has to be
 * added here and is then type-checked everywhere it matters.
 */
export const currencyCodes = ["UAH"] as const;
export type CurrencyCode = (typeof currencyCodes)[number];

/**
 * Minor units per major unit, by currency — used to convert to/from a display
 * amount. UAH: 100 kopecks per hryvnia.
 */
export const MINOR_UNITS_PER_CURRENCY: Record<CurrencyCode, number> = {
  UAH: 100,
};

/**
 * Convert a money value back to a decimal major-unit amount (e.g. for display,
 * or for sending to LiqPay, which expects a decimal amount).
 *
 * Structurally typed rather than taking `Money`, so this module needs no
 * import at all — every `Money` satisfies it.
 */
export function moneyToDecimal(value: {
  currency: CurrencyCode;
  minorUnits: number;
}): number {
  return value.minorUnits / MINOR_UNITS_PER_CURRENCY[value.currency];
}
