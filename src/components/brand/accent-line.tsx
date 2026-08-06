import { cn } from "@/lib/cn";

/**
 * A hairline that the brand accent draws itself across.
 *
 * Two layers, always: a construction-weight rule that is *always* there, and a
 * terracotta overlay on top of it that scales in from the left. The rule below
 * never moves and never disappears, which is the whole point — the accent is
 * an addition to a line that already exists, so nothing about the layout
 * depends on the colour being visible.
 *
 * ## Why it is a transform and not a width
 *
 * `scaleX` on an absolutely-positioned overlay is compositor-only: no layout,
 * no paint of the parent, and it costs one frame on the GPU. Animating `width`
 * would relayout the row on every frame of a hover, twenty times over on a
 * catalogue grid. The global `prefers-reduced-motion` block already collapses
 * the transition to nothing, so the reduced-motion path gets the same two
 * states with no travel between them.
 *
 * ## Why the accent may carry a state here
 *
 * `--brand-accent` measures 3.53–4.32:1 on the site's light surfaces, which
 * clears WCAG 1.4.11's 3:1 for a non-text indicator but *not* 1.4.3's 4.5:1
 * for text. A rule is non-text, so this is a legitimate place for it. It is
 * still never the only signal at any call site: on a product card the whole
 * photo scales under the cursor, and in the colour selector the plate's border
 * and its filled position marker both change independently.
 */
export function BrandAccentLine({
  drawn = false,
  onHover = false,
  className,
}: {
  /** Hold the accent drawn — the selected/active state. */
  drawn?: boolean;
  /** Also draw it while an ancestor `.group` is hovered or focused. */
  onHover?: boolean;
  className?: string;
}) {
  return (
    <span
      aria-hidden="true"
      className={cn(
        "bg-drawing-line-subtle relative block h-(--drawing-stroke) w-full",
        className,
      )}
    >
      <span
        className={cn(
          "bg-brand-accent absolute inset-0 origin-left transition-transform duration-(--duration-normal) ease-(--ease-nav)",
          drawn ? "scale-x-100" : "scale-x-0",
          !drawn &&
            onHover &&
            "group-hover:scale-x-100 group-focus-visible:scale-x-100",
        )}
      />
    </span>
  );
}
