"use client";

import type { Dictionary } from "@/i18n/get-dictionary";
import type { Product, ProductVariant } from "@/lib/schemas/product";
import { useAddToCartAction } from "@/lib/use-add-to-cart-action";
import { Button } from "@/components/ui/button";

/**
 * Real add-to-cart CTA (Prompt 6 §6) — active only once the caller has a
 * complete, resolved `variant` (see `resolveVariant`); callers must not
 * render this at all while a required option is still unselected (show the
 * "select options" prompt instead — see `ProductConfigurator`).
 */
export function AddToCartButton({
  product,
  variant,
  dictionary,
  className,
}: {
  product: Product;
  variant: ProductVariant;
  dictionary: Dictionary;
  className?: string;
}) {
  const { isAdding, handleAdd } = useAddToCartAction({
    product,
    variant,
    dictionary,
  });

  return (
    <Button
      type="button"
      variant="accent"
      onClick={handleAdd}
      disabled={isAdding}
      aria-busy={isAdding}
      className={className}
    >
      {isAdding
        ? dictionary.product.addingToCartCta
        : dictionary.product.addToCartCta}
    </Button>
  );
}
