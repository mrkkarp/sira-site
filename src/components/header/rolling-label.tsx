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
 */
export function RollingLabel({
  children,
  className,
}: {
  children: ReactNode;
  className?: string;
}) {
  return (
    <span className={cn("relative block overflow-hidden", className)}>
      <span className="block transition-transform duration-(--duration-normal) ease-(--ease-nav) group-hover:-translate-y-full group-focus-visible:-translate-y-full">
        {children}
      </span>
      <span
        aria-hidden="true"
        className="absolute inset-0 block translate-y-full transition-transform duration-(--duration-normal) ease-(--ease-nav) group-hover:translate-y-0 group-focus-visible:translate-y-0"
      >
        {children}
      </span>
    </span>
  );
}
