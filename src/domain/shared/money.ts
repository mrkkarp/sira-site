import { z } from "zod";

/**
 * `Price`/`Money` (Prompt 8 §2.1, §3.2) — always integer minor units,
 * never floating point, per the spec's explicit rule ("не зберігай
 * гроші у floating-point"). For UAH, `minorUnits` is kopecks
 * (1 UAH = 100 kopecks). Only UAH is supported today (matches
 * `pricing.currency` being fixed/read-only in `src/collections/
 * Products.ts` from the previous phase) — the `CurrencyCode` enum is
 * intentionally a single-value union so adding a currency later is a
 * type-checked, one-line change rather than a silent runtime surprise.
 */
export const CurrencyCode = z.enum(["UAH"]);
export type CurrencyCode = z.infer<typeof CurrencyCode>;

/** Minor units per major unit, by currency — used to convert to/from a display amount. UAH: 100 kopecks per hryvnia. */
export const MINOR_UNITS_PER_CURRENCY: Record<CurrencyCode, number> = {
  UAH: 100,
};

export const MoneySchema = z.object({
  currency: CurrencyCode,
  /** Non-negative integer, in the currency's minor unit (kopecks for UAH). */
  minorUnits: z.number().int().nonnegative(),
});
export type Money = Readonly<z.infer<typeof MoneySchema>>;

export function money(currency: CurrencyCode, minorUnits: number): Money {
  return MoneySchema.parse({ currency, minorUnits });
}

/** Convert a decimal major-unit amount (e.g. `4500.5` UAH) to a `Money` value. Throws if the amount doesn't divide evenly into the currency's minor unit (guards against silently truncating a fractional kopeck). */
export function moneyFromDecimal(
  currency: CurrencyCode,
  decimalAmount: number,
): Money {
  const factor = MINOR_UNITS_PER_CURRENCY[currency];
  const minorUnits = decimalAmount * factor;
  if (!Number.isInteger(minorUnits)) {
    throw new Error(
      `Amount ${decimalAmount} ${currency} does not divide evenly into minor units`,
    );
  }
  return money(currency, minorUnits);
}

/** Convert a `Money` value back to a decimal major-unit amount (e.g. for display or for sending to LiqPay, which expects a decimal amount). */
export function moneyToDecimal(value: Money): number {
  return value.minorUnits / MINOR_UNITS_PER_CURRENCY[value.currency];
}

export function addMoney(a: Money, b: Money): Money {
  if (a.currency !== b.currency) {
    throw new Error(`Cannot add ${a.currency} and ${b.currency}`);
  }
  return money(a.currency, a.minorUnits + b.minorUnits);
}

export function multiplyMoney(value: Money, factor: number): Money {
  if (!Number.isInteger(factor) || factor < 0) {
    throw new Error(
      "multiplyMoney only supports non-negative integer factors (e.g. quantity)",
    );
  }
  return money(value.currency, value.minorUnits * factor);
}
