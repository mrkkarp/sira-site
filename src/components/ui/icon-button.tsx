import type { ButtonHTMLAttributes, ReactNode } from "react";
import { cn } from "@/lib/cn";

const sizeClass = {
  sm: "h-9 w-9",
  md: "h-11 w-11",
} as const;

type IconButtonProps = ButtonHTMLAttributes<HTMLButtonElement> & {
  icon: ReactNode;
  /** Required — an icon-only button must always have an accessible name. */
  "aria-label": string;
  size?: keyof typeof sizeClass;
};

/**
 * Note that the `text-text` below cannot be overridden from `className`: `cn`
 * is a plain join with no conflict resolution, so a caller's `text-background`
 * and this `text-text` are two single-class selectors of equal specificity and
 * the winner is whichever Tailwind emits later — which is `text-text`.
 *
 * That bit the now-deleted `BackToTop`, which asked for a light glyph on a dark
 * square: the fill applied (nothing competed for it) but the glyph colour did
 * not, so the arrow was stroked in `#1d1d1b` on a `#1d1d1b` square and shipped
 * as a featureless black block. Callers overriding `bg-*` are safe — there is
 * no default background here to collide with. Anything needing a different
 * `color` needs a variant added here, not a class passed in.
 */
export function IconButton({
  icon,
  size = "md",
  className,
  ...props
}: IconButtonProps) {
  return (
    <button
      type="button"
      className={cn(
        "text-text hover:bg-surface-muted inline-flex items-center justify-center transition-colors duration-(--duration-fast) disabled:pointer-events-none disabled:opacity-40",
        sizeClass[size],
        className,
      )}
      {...props}
    >
      {icon}
    </button>
  );
}
