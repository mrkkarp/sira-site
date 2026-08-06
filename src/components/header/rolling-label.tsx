import type { ReactNode } from "react";
import { cn } from "@/lib/cn";

/**
 * The header's signature hover: the label is rendered twice inside a clipped
 * box and both copies slide up by exactly one line, so the word looks like it
 * is being *replaced by itself* rather than dimmed. Adapted from the reference
 * navigation's clip/reveal treatment; it is the reason the brief rules out a
 * plain opacity hover.
 *
 * Two properties matter here:
 *
 *  - It is **transform-only**. No layout, no paint of new pixels beyond the
 *    clip — a whole row of these stays on the compositor at 60fps.
 *  - It is **driven by the ancestor**, via `group-hover:` / `group-focus-visible:`.
 *    The trigger owns the interaction (and therefore the focus ring, the
 *    `aria-*` state, the click target); this stays purely presentational.
 *
 * The second copy is `aria-hidden` — assistive tech must hear the label once,
 * not twice. Under `prefers-reduced-motion` the global rule collapses the
 * transition to ~0ms and the two identical copies make the snap invisible.
 *
 * ## Why `will-change-transform` and an explicit `leading-5`
 *
 * Both exist to stop the label *twitching* at the start and end of the hover.
 * Neither is a micro-optimisation; each fixes a measured defect.
 *
 * `will-change-transform` — the copies have no background of their own
 * (computed `rgba(0,0,0,0)` all the way up to the cell, which is transparent
 * over the hero by design and otherwise only reaches `bg-text/5`). So the
 * moment the transition starts, Chrome promotes each copy to its own
 * compositor layer, cannot prove the text is drawn over opaque pixels, and
 * drops from subpixel (LCD) to grayscale antialiasing — then switches back
 * when the transition ends. The glyphs visibly change weight twice per hover.
 * Promoting the layer up front keeps antialiasing in one mode for good:
 * very slightly lighter text at rest, in exchange for text that does not
 * flinch. An opaque background on the copies would fix it too, and cannot be
 * done — there is no one colour behind them (`bg-background`, `bg-surface`,
 * or the hero photograph).
 *
 * This is also why the mega-menu trigger never showed the fault while the
 * three plain links did: hovering it *opens* the menu, which paints
 * `cellActive`'s opaque `bg-text` under the label, and Chrome keeps LCD text.
 *
 * `leading-5` — the clip box has to be an *even* number of pixels tall or it
 * cannot sit on whole pixels inside the 56px nav cell. The inherited
 * `line-height` was 21px, so the box landed at y=26.5 and was clipped on
 * half-pixel boundaries; on a 1× display the compositor snaps that rect and
 * the label jumps ~0.5px as the layer appears and goes away. 20px centres
 * exactly — (56−20)/2 = 18 — and still clears every glyph these labels use:
 * Manrope's em box is 19px at 14px type, and the deepest ink in the set (the
 * breve of `Й` and the descending leg of `Д` in "ДИЗАЙНЕРАМ", plus the `р`
 * descender in the menu's "Усі вироби") leaves ≥2.6px top and ≥1.1px bottom.
 */
export function RollingLabel({
  children,
  className,
}: {
  children: ReactNode;
  className?: string;
}) {
  return (
    <span className={cn("relative block overflow-hidden leading-5", className)}>
      <span className="block transition-transform duration-(--duration-normal) ease-(--ease-nav) will-change-transform group-hover:-translate-y-full group-focus-visible:-translate-y-full">
        {children}
      </span>
      <span
        aria-hidden="true"
        className="absolute inset-0 block translate-y-full transition-transform duration-(--duration-normal) ease-(--ease-nav) will-change-transform group-hover:translate-y-0 group-focus-visible:translate-y-0"
      >
        {children}
      </span>
    </span>
  );
}
