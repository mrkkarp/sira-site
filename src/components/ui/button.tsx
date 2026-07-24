import type { ButtonHTMLAttributes } from "react";
import { cn } from "@/lib/cn";

const variantClass = {
  "primary-dark": "bg-text text-background hover:bg-graphite",
  "primary-light":
    "bg-background text-text hover:bg-surface-muted border border-border",
  outline:
    "border border-text text-text hover:bg-text hover:text-background bg-transparent",
  ghost: "text-text-muted hover:text-text bg-transparent",
} as const;

const sizeClass = {
  md: "h-11 px-6",
  sm: "h-9 px-4",
} as const;

type ButtonProps = ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: keyof typeof variantClass;
  size?: keyof typeof sizeClass;
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
        "type-nav inline-flex items-center justify-center gap-(--space-2xs) transition-colors duration-(--duration-fast) disabled:pointer-events-none disabled:opacity-40",
        variantClass[variant],
        sizeClass[size],
        className,
      )}
      {...props}
    />
  );
}
