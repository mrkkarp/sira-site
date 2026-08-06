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
        /* The selected ring is the brand accent, not `--color-focus`.
         *
         * It used to be the focus blue, which was wrong twice over. Visually, a
         * saturated cobalt ring is the single most off-brand thing on a page of
         * warm concrete, and it sat right on top of the product's own colour.
         * Semantically it was worse: focus and selection are different states,
         * and drawing them in one colour means a keyboard user tabbing across a
         * row of swatches cannot tell which one they are *on* from which one is
         * *chosen*. The blue now means only "focused", as it does everywhere
         * else on the site.
         *
         * `--brand-accent` rather than `--brand-accent-ink`: a ring is non-text,
         * so it is gated at 1.4.11's 3:1 (3.53–4.32:1 on the light surfaces),
         * and the lighter value separates better from the dark swatches. The
         * ring is never the sole signal — the chosen colour's name is printed
         * underneath in plain text. */
        selected && "outline-2 outline-offset-2 outline-(--color-brand-accent)",
      )}
      style={{ backgroundColor: colour.digitalPreviewHex }}
    />
  );
}
