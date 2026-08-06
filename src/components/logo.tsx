import Link from "next/link";
import type { Locale } from "@/i18n/config";
import { localeHref } from "@/lib/locale-href";
import { cn } from "@/lib/cn";

/**
 * The wordmark's type, shared with the copy of it in `MobileMenu` so the two
 * cannot drift apart — they had already drifted once, and a change to the
 * weight below would otherwise have reached the desktop wordmark only.
 *
 * Type only, no colour: both copies inherit it from what they sit on. The
 * header bar sets `text-text` or, over a hero, `text-background`, and the
 * mobile panel takes the page default. Naming a colour here would freeze one
 * of those and break the other.
 *
 * The weight is a stroke, not a `font-weight`. `Instrument_Serif` ships a
 * single 400 cut — checked in the font manifest Next compiles against,
 * `next/dist/compiled/@next/font/.../font-data.json`, which lists
 * `"weights": ["400"]` — so `font-medium` or `font-semibold` would not load a
 * bolder cut, it would ask the browser to *synthesise* one. Engines fake bold
 * differently (Firefox double-draws with an offset, Chrome and Safari dilate),
 * and on a display serif at 20px the result is the uneven, smeared weight that
 * the rest of this component is written to avoid. `-webkit-text-stroke` is
 * deterministic instead, symmetric about the outline, and the amount is ours
 * to choose: 0.4px is roughly a third of a synthetic bold — enough to read as
 * heavier, not enough to start closing the counters of the D, B and A.
 */
export const wordmarkClass =
  "flex items-center self-stretch font-serif text-xl tracking-tight [-webkit-text-stroke:0.4px_currentColor]";

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
 * Setting the *letters* in terracotta was tried, on the owner's request, and
 * reverted by them on sight — so the letters stay the near-black the bar
 * inherits to them, and the accent stays in the rule. Worth recording, because
 * it is the obvious next idea for anyone who reads the paragraph above and
 * concludes the wordmark is the natural home for the brand colour. It reads as
 * a different, softer brand at 3.93:1, and the header stops being neutral on
 * every page of the site at once. Nothing about it was an accessibility
 * problem — WCAG 1.4.3 exempts a brand name from the contrast minimum, so the
 * colour was allowed; it simply looked wrong, which is the older judgement in
 * the paragraph above being right.
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
      className={cn("group", wordmarkClass)}
      aria-label="ODUDLAB — home"
    >
      <span className="relative">
        ODUDLAB
        {/* Explicitly the accent, not `bg-current`. `bg-current` would inherit
            the wordmark's own colour, which is the near-black the bar sets —
            and the rule being terracotta while the letters are not is the
            entire point of it. */}
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
