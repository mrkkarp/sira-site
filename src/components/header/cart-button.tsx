import Link from "next/link";
import type { Locale } from "@/i18n/config";
import { localeHref } from "@/lib/locale-href";

/**
 * Count is static at 0 — there is no add-to-cart flow yet (cart/checkout is
 * out of scope for this stage, see README). The badge width is fixed so a
 * real count later won't shift surrounding layout.
 */
export function CartButton({ locale, label }: { locale: Locale; label: string }) {
  const count = 0;

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
        className="type-technical-value bg-error absolute top-1 right-1 flex h-4 w-4 items-center justify-center text-[10px] text-white tabular-nums"
      >
        {count}
      </span>
    </Link>
  );
}
