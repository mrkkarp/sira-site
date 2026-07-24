import type { ReactNode } from "react";
import { cn } from "@/lib/cn";

/** Eyebrow + heading (+ optional description and trailing action) for section intros. */
export function SectionHeader({
  eyebrow,
  heading,
  description,
  action,
  className,
}: {
  eyebrow?: string;
  heading: ReactNode;
  description?: ReactNode;
  action?: ReactNode;
  className?: string;
}) {
  return (
    <div
      className={cn(
        "flex flex-col justify-between gap-(--space-sm) md:flex-row md:items-end",
        className,
      )}
    >
      <div className="flex max-w-2xl flex-col gap-(--space-2xs)">
        {eyebrow ? (
          <p className="type-eyebrow text-text-muted">{eyebrow}</p>
        ) : null}
        <h2 className="type-h2 text-text">{heading}</h2>
        {description ? (
          <p className="type-body text-text-muted mt-(--space-2xs)">
            {description}
          </p>
        ) : null}
      </div>
      {action ? <div className="shrink-0">{action}</div> : null}
    </div>
  );
}
