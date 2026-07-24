import { cn } from "@/lib/cn";

/** Loading placeholder. Pulses via opacity only — respects prefers-reduced-motion globally. */
export function Skeleton({ className }: { className?: string }) {
  return (
    <div
      role="presentation"
      aria-hidden="true"
      className={cn(
        "bg-surface-muted animate-pulse motion-reduce:animate-none",
        className,
      )}
    />
  );
}
