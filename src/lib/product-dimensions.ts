import type { ProductSpecEntry } from "@/lib/schemas/product";

/**
 * Matched on each entry's stable `key` rather than its display `label`, for
 * the same reason `getInstallationSpecEntries` does: labels are locale
 * dependent, so label matching would return nothing on `/en` and `/pl`.
 */
const DIMENSION_SPEC_KEYS = new Set(["width", "height", "depth", "diameter"]);

/**
 * The product's real measured axes, parsed from the source "Характеристики"
 * block. Most of the catalogue has none — only a handful of sink models were
 * ever published with dimensions — so callers must handle the empty case by
 * omitting their section rather than drawing an empty figure.
 */
export function getDimensionSpecEntries(
  specEntries: ProductSpecEntry[],
): ProductSpecEntry[] {
  return specEntries.filter(
    (entry) => entry.key != null && DIMENSION_SPEC_KEYS.has(entry.key),
  );
}

/** The complement, so a page that dimensions the axes separately does not
 *  also print them as ordinary specification rows. */
export function withoutDimensionSpecEntries(
  specEntries: ProductSpecEntry[],
): ProductSpecEntry[] {
  return specEntries.filter(
    (entry) => entry.key == null || !DIMENSION_SPEC_KEYS.has(entry.key),
  );
}

export type ScaledDimension = {
  entry: ProductSpecEntry;
  /** This axis measured against the longest axis of the same product, 0–1. */
  ratio: number;
};

/** Values are written by hand in the source ("85 см", "8 см"), so the amount
 *  and the unit have to be read back off the display string. */
const MEASUREMENT = /^(\d+(?:[.,]\d+)?)\s*(\S+)$/;

function parseMeasurement(value: string) {
  const match = MEASUREMENT.exec(value.trim());
  if (!match) return null;
  const amount = Number.parseFloat(match[1].replace(",", "."));
  if (!Number.isFinite(amount) || amount <= 0) return null;
  return { amount, unit: match[2].toLowerCase() };
}

/** Keeps a very short axis long enough to still carry its own label. */
const MIN_RATIO = 0.15;

/**
 * Relative lengths for a product's dimension lines, so a 45 cm diameter is
 * drawn longer than the 10 cm height beside it — a drawing's lines are to
 * scale, and here the scale is the only honest thing available: the lengths
 * *are* the measurements, not an imagined outline of the object.
 *
 * Only meaningful when every axis is comparable, so this bails out to equal
 * full-width lines unless all values parse and all share one unit. Today the
 * whole catalogue is written in "см", but a single "850 мм" row must not be
 * allowed to draw itself twenty times longer than a 85 см one.
 */
export function scaleDimensionEntries(
  entries: ProductSpecEntry[],
): ScaledDimension[] {
  const measurements = entries.map((entry) => parseMeasurement(entry.value));
  const usable = measurements.filter((m) => m !== null);
  const sameUnit = new Set(usable.map((m) => m.unit)).size === 1;

  if (usable.length !== entries.length || !sameUnit) {
    return entries.map((entry) => ({ entry, ratio: 1 }));
  }

  const longest = Math.max(...usable.map((m) => m.amount));
  return entries.map((entry, index) => ({
    entry,
    ratio: Math.max(usable[index].amount / longest, MIN_RATIO),
  }));
}
