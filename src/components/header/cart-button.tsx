"use client";

import Link from "next/link";
import type { Locale } from "@/i18n/config";
import { localeHref } from "@/lib/locale-href";
import { useCart } from "@/lib/cart-store";

/**
 * Reflects the real, live client-side cart count (see `src/lib/cart-store.tsx`).
 * Checkout/payment remain an explicit, honestly-labeled out-of-scope gap —
 * only add/remove/persist is real. The badge width is fixed so the count
 * changing doesn't shift surrounding layout.
 */
export function CartButton({
  locale,
  label,
}: {
  locale: Locale;
  label: string;
}) {
  const { count } = useCart();

  return (
    <Link
      href={localeHref(locale, "/cart")}
      aria-label={`${label} (${count})`}
      className="relative inline-flex h-11 w-11 items-center justify-center"
    >
      <svg aria-hidden="true" viewBox="0 0 24 24" className="h-5 w-5">
        <path
          d="M3 4h2l2 12h11l2-8H6"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
        />
        <circle cx="9" cy="20" r="1.4" fill="currentColor" />
        <circle cx="18" cy="20" r="1.4" fill="currentColor" />
      </svg>
      <span
        aria-hidden="true"
        className="type-technical-value bg-error text-background absolute top-1 right-1 flex h-4 w-4 items-center justify-center text-[10px] tabular-nums"
      >
        {count}
      </span>
    </Link>
  );
}
