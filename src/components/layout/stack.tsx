import type { ElementType, ReactNode } from "react";
import { cn } from "@/lib/cn";

const gapClass = {
  "3xs": "gap-(--space-3xs)",
  "2xs": "gap-(--space-2xs)",
  xs: "gap-(--space-xs)",
  sm: "gap-(--space-sm)",
  md: "gap-(--space-md)",
  lg: "gap-(--space-lg)",
} as const;

const alignClass = {
  start: "items-start",
  center: "items-center",
  end: "items-end",
  stretch: "items-stretch",
} as const;

/** Vertical flex stack with a spacing-scale gap. */
export function Stack({
  as: As = "div",
  gap = "sm",
  align,
  className,
  children,
}: {
  as?: ElementType;
  gap?: keyof typeof gapClass;
  align?: keyof typeof alignClass;
  className?: string;
  children: ReactNode;
}) {
  return (
    <As
      className={cn(
        "flex flex-col",
        gapClass[gap],
        align && alignClass[align],
        className,
      )}
    >
      {children}
    </As>
  );
}
