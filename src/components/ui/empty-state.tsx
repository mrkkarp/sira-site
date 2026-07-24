import type { ReactNode } from "react";

export function EmptyState({
  icon,
  heading,
  description,
  action,
}: {
  icon?: ReactNode;
  heading: string;
  description?: string;
  action?: ReactNode;
}) {
  return (
    <div className="flex flex-col items-center gap-(--space-sm) px-6 py-(--space-xl) text-center">
      {icon ? <div className="text-text-muted">{icon}</div> : null}
      <p className="type-h3 text-text">{heading}</p>
      {description ? (
        <p className="type-body text-text-muted max-w-sm">{description}</p>
      ) : null}
      {action ? <div className="pt-(--space-2xs)">{action}</div> : null}
    </div>
  );
}
