import type { ButtonHTMLAttributes, ReactNode } from "react";
import { cn } from "@/lib/cn";

const sizeClass = {
  sm: "h-9 w-9",
  md: "h-11 w-11",
} as const;

/**
 * The colour pair is picked here rather than passed in, because `cn` is a plain
 * join with no conflict resolution: a caller writing `text-background` in
 * `className` does NOT beat the `text-text` below. Both are plain single-class
 * selectors, so the winner is decided by the order Tailwind emits them in, not
 * by the order they appear in the attribute — and `text-text` happens to win.
 *
 * That is not hypothetical. `BackToTop` passed `bg-text text-background` to get
 * a light arrow on a dark square; the fill applied (nothing competed for it)
 * but the glyph colour did not, so the arrow was stroked in `#1d1d1b` on a
 * `#1d1d1b` square. What shipped was a featureless black block that faded in
 * mid-scroll on every page — reported, reasonably, as a rendering artefact
 * rather than as a button.
 *
 * Anything that sets `color` or a hover fill belongs in this map. Callers may
 * still pass `className`, but for position and layout, not for these two.
 */
const variantClass = {
  /** Dark glyph on the page; the fill only appears on hover. */
  plain: "text-text hover:bg-surface-muted",
  /** Light glyph on a solid dark square — for controls that float over content. */
  solid: "bg-text text-background hover:bg-graphite",
} as const;

type IconButtonProps = ButtonHTMLAttributes<HTMLButtonElement> & {
  icon: ReactNode;
  /** Required — an icon-only button must always have an accessible name. */
  "aria-label": string;
  size?: keyof typeof sizeClass;
  variant?: keyof typeof variantClass;
};

export function IconButton({
  icon,
  size = "md",
  variant = "plain",
  className,
  ...props
}: IconButtonProps) {
  return (
    <button
      type="button"
      className={cn(
        "inline-flex items-center justify-center transition-colors duration-(--duration-fast) disabled:pointer-events-none disabled:opacity-40",
        variantClass[variant],
        sizeClass[size],
        className,
      )}
      {...props}
    >
      {icon}
    </button>
  );
}
