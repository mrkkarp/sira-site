import type { ReactNode } from "react";
import { cn } from "@/lib/cn";

const toneClass = {
  neutral: "bg-surface-muted text-text",
  success: "bg-surface-muted text-success",
  error: "bg-surface-muted text-error",
  /**
   * The brand tone: a terracotta wash carrying terracotta ink, 4.60:1 — so the
   * label is still legible *as text*, which is the whole job of a badge.
   *
   * Deliberately a tint and not a fill. A solid terracotta chip on every
   * catalogue card would be twenty saturated rectangles scattered across twenty
   * product photographs — the "large solid masses" §3 rules out, and exactly
   * what §14's "чи акценти не заважають товару" is asking about. A wash reads
   * as the brand at a glance and as paper up close.
   */
  accent: "bg-brand-accent-tint text-brand-accent-ink",
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
