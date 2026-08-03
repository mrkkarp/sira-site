"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import type { Locale } from "@/i18n/config";
import { localeHref } from "@/lib/locale-href";
import { useCart } from "@/lib/cart-store";
import { cn } from "@/lib/cn";

/**
 * Reflects the real, live cart count (see `src/lib/cart-store.tsx`). Checkout
 * and payment remain an explicit, honestly-labelled out-of-scope gap — only
 * add/remove/persist is real.
 *
 * The badge acknowledges a *change* with a short pop. Two things keep it from
 * firing at the wrong moment:
 *
 *  - It waits for the store's first settled (`isLoading: false`) snapshot
 *    before it starts watching. Otherwise every page load with a persisted
 *    cart would pop the badge as the count went 0 → n during hydration, which
 *    reads as "something just happened" when nothing did.
 *  - The animation is re-triggered by a `key` on the badge rather than by
 *    toggling a class, so two additions in quick succession each get their own
 *    pop instead of the second being swallowed by the first still running.
 *
 * The badge box is a fixed size and the animation is transform-only, so a
 * changing count never shifts the bar around it.
 */
export function CartButton({
  locale,
  label,
  className,
}: {
  locale: Locale;
  label: string;
  className?: string;
}) {
  const { count, isLoading } = useCart();
  const settled = useRef(false);
  const previous = useRef(count);
  const [pulse, setPulse] = useState(0);

  useEffect(() => {
    if (isLoading) return;
    if (!settled.current) {
      settled.current = true;
      previous.current = count;
      return;
    }
    if (previous.current === count) return;
    previous.current = count;
    setPulse((value) => value + 1);
  }, [count, isLoading]);

  return (
    <Link
      href={localeHref(locale, "/cart")}
      aria-label={`${label} (${count})`}
      className={cn("relative", className)}
    >
      <svg
        aria-hidden="true"
        viewBox="0 0 24 24"
        className="h-5 w-5 transition-transform duration-(--duration-normal) ease-(--ease-nav) group-hover:-translate-y-px"
      >
        <path
          d="M3 4h2l2 12h11l2-8H6"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.75"
        />
        <circle cx="9" cy="20" r="1.4" fill="currentColor" />
        <circle cx="18" cy="20" r="1.4" fill="currentColor" />
      </svg>
      {/* No badge at zero. A permanent red "0" is a standing alert for a
          non-event, and over the inverted hero treatment it was the single
          loudest thing in the bar. The count is still announced through the
          link's own label either way. */}
      {count > 0 ? (
        <span
          key={pulse}
          aria-hidden="true"
          className="type-technical-value bg-error text-background absolute top-3 right-2 flex h-4 w-4 [animation:cart-count-in_var(--duration-normal)_var(--ease-nav)_both] items-center justify-center text-[10px] tabular-nums"
        >
          {count}
        </span>
      ) : null}
    </Link>
  );
}
