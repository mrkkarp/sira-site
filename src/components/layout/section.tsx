import type { CSSProperties, ElementType, ReactNode } from "react";
import { cn } from "@/lib/cn";

const spacingClass = {
  lg: "py-(--space-lg)",
  xl: "py-(--space-xl)",
  "2xl": "py-(--space-2xl)",
} as const;

const toneClass = {
  default: "bg-background text-text",
  surface: "bg-surface text-text",
  muted: "bg-surface-muted text-text",
  /** "Production mode" dark section — see BRAND_VISUAL_GUIDE §2.4. */
  dark: "bg-footer text-background",
} as const;

export function Section({
  as: As = "section",
  spacing = "lg",
  tone = "default",
  className,
  style,
  children,
}: {
  as?: ElementType;
  spacing?: keyof typeof spacingClass;
  tone?: keyof typeof toneClass;
  className?: string;
  /** Escape hatch for a section-level inline style (e.g. a very soft,
   * data-driven background tint) — use sparingly, `tone` should cover most
   * cases. */
  style?: CSSProperties;
  children: ReactNode;
}) {
  return (
    <As
      className={cn(spacingClass[spacing], toneClass[tone], className)}
      style={style}
    >
      {children}
    </As>
  );
}
