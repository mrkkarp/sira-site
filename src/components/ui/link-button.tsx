import Link from "next/link";
import type { ComponentProps } from "react";
import {
  buttonBaseClass,
  buttonSizeClass,
  buttonVariantClass,
} from "@/components/ui/button";
import { cn } from "@/lib/cn";

type LinkButtonProps = ComponentProps<typeof Link> & {
  variant?: keyof typeof buttonVariantClass;
  size?: keyof typeof buttonSizeClass;
};

/**
 * `Button` renders a plain `<button>` (not polymorphic), so any CTA that
 * must navigate — rather than submit/trigger client logic — uses this
 * instead of nesting an `<a>` inside a `<button>`. Same visual variants.
 */
export function LinkButton({
  variant = "primary-dark",
  size = "md",
  className,
  ...props
}: LinkButtonProps) {
  return (
    <Link
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
