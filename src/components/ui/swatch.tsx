import type { ProductColour } from "@/lib/schemas/colour";
import { cn } from "@/lib/cn";

export function Swatch({
  colour,
  selected,
  onSelect,
  size = "md",
}: {
  colour: Pick<ProductColour, "slug" | "displayName" | "digitalPreviewHex">;
  selected?: boolean;
  onSelect?: (slug: string) => void;
  size?: "sm" | "md";
}) {
  return (
    <button
      type="button"
      aria-pressed={selected}
      aria-label={colour.displayName}
      title={colour.displayName}
      onClick={onSelect ? () => onSelect(colour.slug) : undefined}
      className={cn(
        "border-border-strong relative border transition-shadow duration-(--duration-fast)",
        size === "md" ? "h-12 w-12" : "h-8 w-8",
        selected && "outline-2 outline-offset-2 outline-(--color-focus)",
      )}
      style={{ backgroundColor: colour.digitalPreviewHex }}
    />
  );
}
