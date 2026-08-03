/**
 * The sheet's numbering convention: two digits, zero-padded. One convention
 * across the whole site — categories, specification rows, gallery frames,
 * colour options, product sections — because a drawing that numbered some
 * things `1` and others `01` would just look like two drawings.
 *
 * Numbers past 99 are left alone rather than truncated; nothing on the site
 * enumerates that far today, but silently rendering `10` for item 100 would
 * be worse than a three-digit label.
 */
export function drawingIndex(value: number | string): string {
  return typeof value === "number" ? String(value).padStart(2, "0") : value;
}
