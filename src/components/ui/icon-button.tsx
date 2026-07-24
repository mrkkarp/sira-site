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
