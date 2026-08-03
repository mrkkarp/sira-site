"use client";

import Link from "next/link";
import { useState } from "react";
import type { Locale } from "@/i18n/config";
import type { Dictionary } from "@/i18n/get-dictionary";
import { formatTemplate } from "@/lib/format-template";
import { localeHref } from "@/lib/locale-href";
import { useCart, type CartLineItem } from "@/lib/cart-store";
import { Price } from "@/components/ui/price";
import { Skeleton } from "@/components/ui/skeleton";
import { EmptyState } from "@/components/ui/empty-state";
import { LinkButton } from "@/components/ui/link-button";
import { IconButton } from "@/components/ui/icon-button";
import { Divider } from "@/components/ui/divider";

/**
 * Real `/cart` page (Prompt 8 §2.3/§6, Phase D, checkout CTA added in
 * Phase F) — reads the live, server-persisted cart via `useCart()` (see
 * `src/lib/cart-store.tsx`). The checkout CTA is disabled while any line
 * is flagged unavailable; `/checkout` and `placeOrder()` re-validate
 * every line server-side regardless, this is just an honest hint before
 * the user gets there.
 */
export function CartPageContent({
  locale,
  dictionary,
}: {
  locale: Locale;
  dictionary: Dictionary;
}) {
  const { items, subtotal, isLoading, removeItem, setQuantity } = useCart();
  const copy = dictionary.cart;
  const hasUnavailableItem = items.some((line) => !line.orderable);

  if (isLoading) {
    return (
      <div className="flex flex-col gap-(--space-sm)">
        <Skeleton className="h-20 w-full" />
        <Skeleton className="h-20 w-full" />
      </div>
    );
  }

  if (items.length === 0) {
    return (
      <EmptyState
        heading={copy.emptyMessage}
        action={
          <LinkButton href={localeHref(locale, "/shop")}>
            {copy.continueShoppingCta}
          </LinkButton>
        }
      />
    );
  }

  return (
    <div className="flex flex-col gap-(--space-lg)">
      <ul className="flex flex-col">
        {items.map((line) => (
          <li key={line.id}>
            <CartLineRow
              line={line}
              locale={locale}
              copy={copy}
              onRemove={() => removeItem(line.id)}
              onSetQuantity={(quantity) => setQuantity(line.id, quantity)}
            />
            <Divider />
          </li>
        ))}
      </ul>

      <div className="flex items-baseline justify-between">
        <span className="type-h4 text-text">{copy.totalLabel}</span>
        <Price amount={subtotal} locale={locale} className="type-h4" />
      </div>

      {hasUnavailableItem ? (
        <p className="type-caption text-error">{copy.checkoutNotice}</p>
      ) : null}

      <div className="flex flex-wrap gap-(--space-sm)">
        <LinkButton
          href={localeHref(locale, "/checkout")}
          aria-disabled={hasUnavailableItem}
          onClick={(event) => {
            if (hasUnavailableItem) event.preventDefault();
          }}
          className={
            hasUnavailableItem ? "pointer-events-none opacity-60" : undefined
          }
        >
          {dictionary.checkout.submitCta}
        </LinkButton>
        <LinkButton href={localeHref(locale, "/shop")} variant="outline">
          {copy.continueShoppingCta}
        </LinkButton>
      </div>
    </div>
  );
}

function CartLineRow({
  line,
  locale,
  copy,
  onRemove,
  onSetQuantity,
}: {
  line: CartLineItem;
  locale: Locale;
  copy: Dictionary["cart"];
  onRemove: () => void;
  onSetQuantity: (quantity: number) => void;
}) {
  const [isMutating, setIsMutating] = useState(false);

  async function handleQuantityChange(next: number) {
    if (next < 1 || isMutating) return;
    setIsMutating(true);
    await onSetQuantity(next);
    setIsMutating(false);
  }

  async function handleRemove() {
    if (isMutating) return;
    setIsMutating(true);
    await onRemove();
    setIsMutating(false);
  }

  const displayPrice = line.currentPrice ?? line.unitPrice;

  return (
    <div className="grid grid-cols-[1fr_auto_auto_auto] items-center gap-(--space-sm) py-(--space-sm)">
      <div className="flex flex-col gap-(--space-3xs)">
        {/*
         * The name is the one thing a visitor is likely to want to click here:
         * to re-check a spec, a colour or a photo before committing to the
         * order. It was a bare `<span>`, so the only way back to the product
         * was the browser's Back button — and once you have paged around the
         * shop, that is no longer one press away.
         */}
        <Link
          href={localeHref(locale, `/products/${line.productSlug}`)}
          className="type-body text-text hover:text-text-muted underline-offset-4 hover:underline"
        >
          {line.productName}
        </Link>
        {line.variantLabel ? (
          <span className="type-caption text-text-muted">
            {line.variantLabel}
          </span>
        ) : null}
        {!line.orderable ? (
          <span className="type-caption text-error">
            {copy.unavailableNotice}
          </span>
        ) : line.priceChanged ? (
          <span className="type-caption text-error">
            {copy.priceChangedNotice}
          </span>
        ) : null}
      </div>

      {/*
       * Every control below names the product it acts on. A cart is a list of
       * near-identical rows, and a screen reader announces controls out of
       * their visual context — with the old labels the whole page was "Кількість
       * −, Кількість, Кількість +, Видалити" repeated once per line, with
       * nothing tying any of them to a product. The visible glyphs stay bare;
       * this is the accessible name only.
       */}
      <div
        className="border-border-strong inline-flex h-11 items-stretch border"
        aria-disabled={isMutating}
      >
        <button
          type="button"
          aria-label={formatTemplate(copy.decreaseQuantityCta, {
            name: line.productName,
          })}
          disabled={isMutating || line.quantity <= 1}
          onClick={() => handleQuantityChange(line.quantity - 1)}
          className="text-text hover:bg-surface-muted w-9 disabled:pointer-events-none disabled:opacity-40"
        >
          −
        </button>
        <output
          aria-label={formatTemplate(copy.quantityForItem, {
            name: line.productName,
          })}
          className="type-technical-value text-text flex w-10 items-center justify-center"
        >
          {line.quantity}
        </output>
        <button
          type="button"
          aria-label={formatTemplate(copy.increaseQuantityCta, {
            name: line.productName,
          })}
          disabled={isMutating}
          onClick={() => handleQuantityChange(line.quantity + 1)}
          className="text-text hover:bg-surface-muted w-9 disabled:pointer-events-none disabled:opacity-40"
        >
          +
        </button>
      </div>

      <Price amount={displayPrice * line.quantity} locale={locale} />

      <IconButton
        icon={<span aria-hidden="true">×</span>}
        aria-label={formatTemplate(copy.removeItemCta, {
          name: line.productName,
        })}
        disabled={isMutating}
        onClick={handleRemove}
      />
    </div>
  );
}
