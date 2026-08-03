import Link from "next/link";
import type { Locale } from "@/i18n/config";
import { localeHref } from "@/lib/locale-href";

/**
 * The wordmark, and the most restrained hover in the header: one rule that
 * draws itself under the letters over `--duration-slow`. Nothing about the
 * type itself moves — a letter-spacing or scale change on a logo is both a
 * layout animation and, at this size, visibly wobbly. The rule is a transform
 * on a 1px box, so it costs nothing.
 *
 * `self-stretch` is a hit-target fix, not a layout one: the wordmark's glyph
 * box is only 28px tall, so as a plain inline link it was the one control in
 * the bar under the 44px minimum (WCAG 2.5.5) — and on mobile it is the *home*
 * link, the one people reach for most. Stretching the anchor to the full 56px
 * row makes the tappable area match the cell it visually occupies. It must be
 * `self-stretch` rather than `h-full`: the parent cell sets `items-center`, so
 * only overriding `align-self` frees the anchor to fill the line, and it does
 * not depend on a percentage height resolving against a definite parent.
 *
 * The underline then has to move onto an inner `<span>`. Left on the anchor it
 * would be positioned against the 56px box and draw itself somewhere below the
 * letters instead of under them.
 */
export function Logo({ locale }: { locale: Locale }) {
  return (
    <Link
      href={localeHref(locale, "/")}
      className="group flex items-center self-stretch font-serif text-xl tracking-tight"
      aria-label="ODUDLAB — home"
    >
      <span className="relative">
        ODUDLAB
        <span
          aria-hidden="true"
          className="absolute inset-x-0 -bottom-0.5 h-px origin-left scale-x-0 bg-current transition-transform duration-(--duration-slow) ease-(--ease-nav) group-hover:scale-x-100 group-focus-visible:scale-x-100"
        />
      </span>
    </Link>
  );
}
