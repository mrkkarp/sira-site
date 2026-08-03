import type { ProductSpecEntry } from "@/lib/schemas/product";
import { scaleDimensionEntries } from "@/lib/product-dimensions";
import { CoordinateLabel, DimensionLine } from "@/components/technical-drawing";

/**
 * The product's measured axes, written the way a sheet writes them (Prompt
 * §6): the value set clear of a ruled line that carries extension ticks and
 * outward arrowheads, one axis per row.
 *
 * ## Why there is no silhouette behind the dimensions
 *
 * §6 allows dimension lines to be drawn over a neutral product silhouette.
 * Nothing in the catalogue records a product's outline — the source data has
 * photographs and a handful of parsed numbers, no vector geometry — so any
 * shape drawn here would be an invented one, and a dimension arrow pointing at
 * a made-up contour is worse than no figure at all. §6's own fallback is taken
 * instead: typography plus the dimension-line composition, nothing else.
 *
 * For the same reason every axis is drawn horizontally. A vertical dimension
 * means "measured up the elevation", and with no elevation on the sheet there
 * is nothing for it to be vertical *against*; the axis name carries the
 * direction instead. It also keeps the block one column on a phone (§17).
 *
 * What the figure does keep from a real sheet is scale: the lines share one
 * origin and their lengths are in proportion to the measurements, so the
 * proportions of the object are readable at a glance (see
 * `scaleDimensionEntries`). The block is held to a text measure rather than
 * the full width of the panel — a dimension stretched across a whole page
 * stops reading as a measurement and starts reading as a divider.
 *
 * The lines are `aria-hidden` inside `DimensionLine`; the axis name and the
 * value are real text, so a screen reader reads "Діаметр, 45 см".
 */
export function ProductDimensions({
  entries,
}: {
  entries: ProductSpecEntry[];
}) {
  return (
    <dl className="flex max-w-md flex-col gap-(--space-md)">
      {scaleDimensionEntries(entries).map(({ entry, ratio }) => (
        <div key={entry.key ?? entry.label}>
          <dt>
            <CoordinateLabel>{entry.label}</CoordinateLabel>
          </dt>
          <dd
            className="mt-(--space-3xs)"
            style={{ width: `${(ratio * 100).toFixed(2)}%` }}
          >
            <DimensionLine>{entry.value}</DimensionLine>
          </dd>
        </div>
      ))}
    </dl>
  );
}
