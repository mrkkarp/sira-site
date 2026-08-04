import type { Locale } from "@/i18n/config";
import { cn } from "@/lib/cn";

/**
 * The one spelling of the currency, for everything that renders a price.
 *
 * The store sells in UAH only, and `Intl`'s `style: "currency"` turned out
 * not to be usable for it: Node's bundled ICU and the browser's resolve the
 * UAH *symbol* to different strings for the same locale ("грн" vs "₴"), which
 * is a hydration mismatch the moment a price is rendered on the server. The
 * previous workaround — `currencyDisplay: "code"` — was deterministic, but it
 * printed "UAH 1 250" to Ukrainian shoppers while the catalogue's filter
 * chips said "грн" and the search drawer said "₴". Three spellings of one
 * currency on one site, and the primary audience got the least readable one.
 *
 * So the number is formatted on its own — digit grouping is stable across ICU
 * versions in a way currency symbols are not — and the unit is a literal we
 * control. Exported, so the few places that assemble their own price-shaped
 * strings use the same word rather than inventing a fourth.
 */
export const currencySuffix: Record<Locale, string> = {
  uk: "грн",
  en: "UAH",
  pl: "UAH",
};

export function formatPrice(amount: number, locale: Locale) {
  const number = new Intl.NumberFormat(locale, {
    maximumFractionDigits: 0,
  }).format(amount);
  // The separator is U+00A0, spelled as an escape rather than typed: a
  // literal non-breaking space is invisible in source and is exactly what a
  // later whitespace tidy-up silently turns back into a normal one. The
  // amount must never wrap away from its unit.
  return `${number}\u00A0${currencySuffix[locale]}`;
}

export function Price({
  amount,
  compareAtAmount,
  locale,
  size = "md",
  className,
}: {
  amount: number;
  /** Original price, shown struck through, when the item is discounted. */
  compareAtAmount?: number;
  locale: Locale;
  /**
   * `"md"` — the catalogue size: one line among several on a card, in the
   * cart, in the search drawer. `"lg"` — the product page's headline price.
   *
   * A prop rather than a `className` the caller passes in, because both sizes
   * are set by a `type-*` utility and both of those set `font-size`: stacking
   * two of them on one element makes the winner depend on the order the
   * utilities appear in the compiled stylesheet, which no call site can see.
   */
  size?: "md" | "lg";
  className?: string;
}) {
  return (
    <span
      className={cn(
        size === "lg" ? "type-price-lg" : "type-price",
        "text-text inline-flex items-baseline gap-(--space-2xs)",
        className,
      )}
    >
      <span>{formatPrice(amount, locale)}</span>
      {compareAtAmount && compareAtAmount > amount ? (
        <span className="type-body-sm text-text-muted line-through">
          {formatPrice(compareAtAmount, locale)}
        </span>
      ) : null}
    </span>
  );
}
