import type { ElementType, ReactNode } from "react";
import { cn } from "@/lib/cn";

const gapClass = {
  "3xs": "gap-(--space-3xs)",
  "2xs": "gap-(--space-2xs)",
  xs: "gap-(--space-xs)",
  sm: "gap-(--space-sm)",
  md: "gap-(--space-md)",
} as const;

const alignClass = {
  start: "items-start",
  center: "items-center",
  end: "items-end",
  stretch: "items-stretch",
} as const;

/** Horizontal flex row with a spacing-scale gap. Wraps by default. */
export function Inline({
  as: As = "div",
  gap = "sm",
  align = "center",
  wrap = true,
  className,
  children,
}: {
  as?: ElementType;
  gap?: keyof typeof gapClass;
  align?: keyof typeof alignClass;
  wrap?: boolean;
  className?: string;
  children: ReactNode;
}) {
  return (
    <As
      className={cn(
        "flex",
        wrap && "flex-wrap",
        gapClass[gap],
        alignClass[align],
        className,
      )}
    >
      {children}
    </As>
  );
}
