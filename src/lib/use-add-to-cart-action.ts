"use client";

import { useCallback, useState } from "react";
import type { Dictionary } from "@/i18n/get-dictionary";
import type { Product, ProductVariant } from "@/lib/schemas/product";
import { useCart } from "@/lib/cart-store";
import { useToast } from "@/components/ui/toast";
import { formatTemplate } from "@/lib/format-template";

/**
 * Shared add-to-cart action for the main configurator panel and the mobile
 * sticky bar (Prompt 6 §6/§14) — one real cart write + one screen-reader
 * announcement, not duplicated per caller.
 *
 * "Loading state; prevents double-add": `isAdding` is tied to the real
 * `addItem()` network round trip (see the Prompt 9 note below) — it blocks
 * a second dispatch for as long as the request is actually in flight, and
 * also drives the visible "Додаємо…" label, real feedback rather than a
 * fabricated spinner.
 *
 * "Opens cart drawer/success state": reuses the app's existing
 * `ToastProvider` (`aria-live="polite"`) rather than building a second,
 * redundant success-announcement mechanism.
 *
 * Prompt 9 §9/§11 (e2e + security audit) — this used to fire the success
 * toast unconditionally, without awaiting `addItem()` or checking whether
 * it actually succeeded. `addItem()` never throws (the cart store captures
 * network/HTTP failures internally rather than rejecting), so a same-origin
 * check failure, a rate-limit rejection, or any other server error was
 * silently swallowed while the visitor still saw "added to cart" — the
 * cart badge just never actually incremented. Now awaits the real result
 * and shows the honest outcome.
 */
export function useAddToCartAction({
  product,
  variant,
  dictionary,
}: {
  product: Product;
  variant: ProductVariant;
  dictionary: Dictionary;
}) {
  const { addItem } = useCart();
  const toast = useToast();
  const [isAdding, setIsAdding] = useState(false);

  const handleAdd = useCallback(() => {
    if (isAdding) return;
    setIsAdding(true);
    void addItem({ slug: product.slug, variantSku: variant.sku })
      .then((succeeded) => {
        toast.show(
          succeeded
            ? formatTemplate(dictionary.product.addedToCartAnnouncement, {
                name: product.name,
              })
            : dictionary.product.addToCartError,
          succeeded ? "success" : "error",
        );
      })
      .finally(() => setIsAdding(false));
  }, [isAdding, addItem, product, variant, dictionary, toast]);

  return { isAdding, handleAdd };
}
