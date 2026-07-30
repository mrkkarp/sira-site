"use client";

import type { Locale } from "@/i18n/config";
import type { Dictionary } from "@/i18n/get-dictionary";
import type { Product, ProductVariant } from "@/lib/schemas/product";
import { Price } from "@/components/ui/price";
import { Button } from "@/components/ui/button";
import { useAddToCartAction } from "@/lib/use-add-to-cart-action";

/**
 * Compact mobile sticky CTA bar — Prompt 6 §14. Rendered by
 * `ProductExperience` only once: (a) the shopper has scrolled past the main
 * CTA (`visible`), (b) the resolved variant is real and orderable
 * (`variant` is only passed once `isComplete`), and (c) the cookie-consent
 * banner has already been decided (`hideForCookieBanner`) so the two fixed
 * bottom bars never stack/overlap.
 */
export function MobileStickyCta({
  visible,
  hideForCookieBanner,
  product,
  variant,
  isCustomColour,
  onRequestQuote,
  dictionary,
  locale,
}: {
  visible: boolean;
  hideForCookieBanner: boolean;
  product: Product;
  variant: ProductVariant | undefined;
  isCustomColour: boolean;
  onRequestQuote: () => void;
  dictionary: Dictionary;
  locale: Locale;
}) {
  const { isAdding, handleAdd } = useAddToCartAction({
    product,
    variant: variant ?? product.base,
    dictionary,
  });

  if (!visible || hideForCookieBanner || !variant) return null;

  return (
    <div
      className="bg-background border-border fixed inset-x-0 bottom-0 z-40 border-t lg:hidden"
      style={{ paddingBottom: "env(safe-area-inset-bottom)" }}
    >
      <div className="flex items-center justify-between gap-(--space-sm) px-(--space-sm) py-(--space-2xs)">
        <div className="min-w-0">
          <p className="type-body-sm text-text truncate">{product.name}</p>
          <div className="flex items-baseline gap-(--space-3xs)">
            <Price
              amount={variant.price}
              locale={locale}
              className="type-body-sm"
            />
            {variant.colorLabel ? (
              <span className="type-caption text-text-muted truncate">
                {variant.colorLabel}
              </span>
            ) : null}
          </div>
        </div>
        {isCustomColour ? (
          <Button
            type="button"
            size="sm"
            onClick={onRequestQuote}
            className="shrink-0"
          >
            {dictionary.product.requestQuoteCta}
          </Button>
        ) : (
          <Button
            type="button"
            size="sm"
            onClick={handleAdd}
            disabled={isAdding}
            aria-busy={isAdding}
            className="shrink-0"
          >
            {isAdding
              ? dictionary.product.addingToCartCta
              : dictionary.product.addToCartCta}
          </Button>
        )}
      </div>
    </div>
  );
}
