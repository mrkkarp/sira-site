import type { PaletteShade } from "@/content/colour-palette";

/**
 * Static swatch grid for the `/colours` palette section. Deliberately NOT the
 * homepage `ColourPalette` block and NOT `<Swatch>`:
 *
 * - Those are interactive (`"use client"`, `useState`, `<button aria-pressed>`)
 *   because picking a swatch there *selects* something. Here nothing is
 *   selectable — this is a printed reference chart, so it stays a server
 *   component with zero JS. Making nine colour tiles clickable would promise an
 *   interaction that leads nowhere.
 * - `<Swatch>` is typed against `ProductColour`, the orderable-finish model.
 *   These shades are illustrative examples and are kept out of that model on
 *   purpose (see `src/content/colour-palette.ts`).
 *
 * The tiles are `aria-hidden` and purely decorative: every shade's name and
 * description sit next to it as real text, so a screen reader loses nothing,
 * and a colour tile has no accessible name worth announcing anyway.
 *
 * Invents no copy — `name`, `note` and the caption all come from content.
 */
export function ColourSwatchGrid({
  shades,
  note,
}: {
  shades: PaletteShade[];
  note: string;
}) {
  return (
    <div className="mt-(--space-md)">
      <ul className="grid grid-cols-2 gap-x-(--space-md) gap-y-(--space-lg) sm:grid-cols-3">
        {shades.map((shade) => (
          <li key={shade.slug}>
            <div
              aria-hidden="true"
              className="border-border-strong aspect-[4/3] w-full border"
              style={{ backgroundColor: shade.hex }}
            />
            <p className="type-h4 text-text mt-(--space-xs)">{shade.name}</p>
            <p className="type-caption text-text-muted mt-(--space-3xs)">
              {shade.note}
            </p>
          </li>
        ))}
      </ul>

      <p className="type-caption text-text-muted mt-(--space-md) max-w-md">
        {note}
      </p>
    </div>
  );
}
