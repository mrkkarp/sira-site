import type { Locale } from "@/i18n/config";
import { cn } from "@/lib/cn";

const currencyByLocale: Record<Locale, string> = {
  uk: "UAH",
  en: "UAH",
  pl: "UAH",
};

/**
 * `currencyDisplay: "code"` (renders "UAH", not a symbol) is deliberate:
 * Node's bundled ICU and a browser's ICU can resolve the UAH *symbol*
 * ("грн" vs "₴") to different strings for the same locale, which breaks
 * SSR hydration the moment a currency symbol is rendered server-side. The
 * ISO code has no such ambiguity.
 */
function formatAmount(amount: number, locale: Locale) {
  return new Intl.NumberFormat(locale, {
    style: "currency",
    currency: currencyByLocale[locale],
    currencyDisplay: "code",
    maximumFractionDigits: 0,
  }).format(amount);
}

export function Price({
  amount,
  compareAtAmount,
  locale,
  className,
}: {
  amount: number;
  /** Original price, shown struck through, when the item is discounted. */
  compareAtAmount?: number;
  locale: Locale;
  className?: string;
}) {
  return (
    <span
      className={cn(
        "type-price text-text inline-flex items-baseline gap-(--space-2xs)",
        className,
      )}
    >
      <span>{formatAmount(amount, locale)}</span>
      {compareAtAmount && compareAtAmount > amount ? (
        <span className="type-body-sm text-text-muted line-through">
          {formatAmount(compareAtAmount, locale)}
        </span>
      ) : null}
    </span>
  );
}
