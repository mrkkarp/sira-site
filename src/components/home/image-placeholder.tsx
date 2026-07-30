import { cn } from "@/lib/cn";

/**
 * Stand-in for a real photograph that hasn't been delivered yet.
 * IMAGE_REQUIREMENTS.md bans stock/AI photography outright — including as a
 * "temporary" placeholder — so every homepage section that's waiting on real
 * photography renders this instead of a picture. Reuses the one existing
 * `dictionary.megaMenu.catalog.editorialImageAlt` string ("Фото очікується")
 * everywhere rather than inventing new placeholder copy per section.
 */
export function ImagePlaceholder({
  label,
  className,
}: {
  label: string;
  className?: string;
}) {
  return (
    <div
      role="img"
      aria-label={label}
      className={cn(
        "bg-surface-muted flex h-full w-full items-center justify-center",
        className,
      )}
    >
      <span className="type-caption text-text-muted px-(--space-sm) text-center">
        {label}
      </span>
    </div>
  );
}
