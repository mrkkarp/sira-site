import { z } from "zod";
import { currencyCodes, MINOR_UNITS_PER_CURRENCY } from "./money-units";

/**
 * `Price`/`Money` (Prompt 8 §2.1, §3.2) — always integer minor units,
 * never floating point, per the spec's explicit rule ("не зберігай
 * гроші у floating-point"). For UAH, `minorUnits` is kopecks
 * (1 UAH = 100 kopecks).
 *
 * The currency list, the minor-unit table and `moneyToDecimal` live in
 * `./money-units.ts`, which imports nothing: they are needed by client
 * components that only *display* a total, and reaching them through this
 * module put zod in the browser. They are re-exported here so this stays the
 * single import site for anything money-shaped on the server.
 */
export const CurrencyCode = z.enum(currencyCodes);
export type CurrencyCode = z.infer<typeof CurrencyCode>;

export {
  currencyCodes,
  MINOR_UNITS_PER_CURRENCY,
  moneyToDecimal,
} from "./money-units";

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
