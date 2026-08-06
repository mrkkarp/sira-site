import Link from "next/link";
import type { Locale } from "@/i18n/config";
import { localeHref } from "@/lib/locale-href";
import { cn } from "@/lib/cn";

/**
 * The wordmark, and the most restrained hover in the header: one rule that
 * draws itself under the letters over `--duration-slow`. Nothing about the
 * type itself moves — a letter-spacing or scale change on a logo is both a
 * layout animation and, at this size, visibly wobbly. The rule is a transform
 * on a 1px box, so it costs nothing.
 *
 * That rule is the brand accent, and it is the only terracotta in the header.
 * It earns the place by being the one mark in the bar that belongs to the
 * wordmark itself rather than to the navigation — and by being invisible until
 * someone reaches for it, so the resting header stays exactly as neutral as it
 * was. Filling the active nav cell instead was the obvious alternative and is
 * wrong twice over: it is a solid slab of colour on every page, and the cell
 * sets its label in `--color-background`, which measures 3.93:1 on terracotta
 * — under AA for 14px text.
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
export function Logo({
  locale,
  inverted = false,
}: {
  locale: Locale;
  /** True while the bar floats over a dark hero. The rule has to switch with
   *  it: `--brand-accent` is a light-surface value and disappears into a dark
   *  photograph, whereas `--brand-accent-on-dark` is the same hue lifted until
   *  it reads there (5.75:1 on `--color-footer`). */
  inverted?: boolean;
}) {
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
          className={cn(
            "absolute inset-x-0 -bottom-0.5 h-px origin-left scale-x-0 transition-transform duration-(--duration-slow) ease-(--ease-nav) group-hover:scale-x-100 group-focus-visible:scale-x-100",
            inverted ? "bg-brand-accent-on-dark" : "bg-brand-accent",
          )}
        />
      </span>
    </Link>
  );
}
