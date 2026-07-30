import type { ButtonHTMLAttributes } from "react";
import { cn } from "@/lib/cn";

/** Shared with `LinkButton` — keep the two visually identical. */
export const buttonVariantClass = {
  "primary-dark": "bg-text text-background hover:bg-graphite",
  "primary-light":
    "bg-background text-text hover:bg-surface-muted border border-border",
  outline:
    "border border-text text-text hover:bg-text hover:text-background bg-transparent",
  ghost: "text-text-muted hover:text-text bg-transparent",
  /** Same shape as `primary-light`, tuned for use on the dark footer/hero
   * sections (light fill stays legible on `--color-footer`). */
  "outline-light":
    "border border-background text-background hover:bg-background hover:text-footer bg-transparent",
} as const;

export const buttonSizeClass = {
  md: "h-11 px-6",
  sm: "h-9 px-4",
} as const;

export const buttonBaseClass =
  "type-nav inline-flex items-center justify-center gap-(--space-2xs) transition-colors duration-(--duration-fast) disabled:pointer-events-none disabled:opacity-40";

type ButtonProps = ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: keyof typeof buttonVariantClass;
  size?: keyof typeof buttonSizeClass;
};

/** Rectangular by design — see BRAND_VISUAL_GUIDE §6, no radius on hover/press. */
export function Button({
  variant = "primary-dark",
  size = "md",
  className,
  ...props
}: ButtonProps) {
  return (
    <button
      className={cn(
        buttonBaseClass,
        buttonVariantClass[variant],
        buttonSizeClass[size],
        className,
      )}
      {...props}
    />
  );
}
