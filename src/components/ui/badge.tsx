import type { ReactNode } from "react";
import { cn } from "@/lib/cn";

const toneClass = {
  neutral: "bg-surface-muted text-text",
  success: "bg-surface-muted text-success",
  error: "bg-surface-muted text-error",
} as const;

export function Badge({
  tone = "neutral",
  children,
  className,
}: {
  tone?: keyof typeof toneClass;
  children: ReactNode;
  className?: string;
}) {
  return (
    <span
      className={cn(
        "type-technical-label inline-flex items-center px-(--space-2xs) py-(--space-3xs)",
        toneClass[tone],
        className,
      )}
    >
      {children}
    </span>
  );
}
