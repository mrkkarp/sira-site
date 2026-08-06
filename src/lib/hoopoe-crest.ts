/**
 * The hoopoe crest's geometry, in one place.
 *
 * The mark is drawn twice by two things that cannot share a component:
 * `HoopoeCrest` renders it as React with Tailwind classes, and
 * `renderStatusPage()` has to emit it as a raw SVG string with literal hex
 * fills, because the proxy serves that page without the stylesheet or the font
 * pipeline (see `status-page.ts` for why it renders its own HTML at all).
 *
 * Two renderers, one set of coordinates. Copying twelve path strings into the
 * proxy would mean the next adjustment to the mark silently applies to the
 * site's crest and not the 404's, and nothing would catch the drift — the two
 * are never on screen together. So the numbers live here and both sides read
 * them.
 *
 * The design rationale for the shapes themselves — why the crest and not the
 * beak, why the tips are banded, why the bases sit on an arc, why the tip
 * stroke is not thickened — is documented on `HoopoeCrest`, which is where
 * anyone changing the mark will look first.
 */

export const CREST_VIEWBOX = "0 0 28 17";

/** Stroke width in viewBox units. Shared by both groups: a feather is one
 *  continuous stroke that changes colour, not a stick with a bulb on it. */
export const CREST_STROKE_WIDTH = 1.2;

/** Base to two thirds — drawn in the drawing layer's line colour. */
export const CREST_SHAFTS = [
  "M11 15 5.97 10.13",
  "M12.5 14.6 9.22 6.86",
  "M14 14.5V5.54",
  "m15.5 14.6 3.28-7.74",
  "m17 15 5.03-4.87",
] as const;

/** The banded ends — the only part that takes the brand accent. */
export const CREST_TIPS = [
  "M5.97 10.13 3.81 8.05",
  "M9.22 6.86 7.81 3.55",
  "M14 5.54V1.7",
  "m18.78 6.86 1.41-3.31",
  "m22.03 10.13 2.16-2.08",
] as const;

/**
 * The mark as a standalone SVG string, for the one consumer that has no
 * stylesheet to name colours with. Colours are passed in rather than defaulted
 * so the call site has to state the ground it is drawing on.
 */
export function renderCrestSvg({
  width,
  shaft,
  tip,
}: {
  /** Rendered width in px; height follows the 28:17 viewBox. */
  width: number;
  shaft: string;
  tip: string;
}): string {
  const height = Math.round((width * 17) / 28);
  const group = (paths: readonly string[], colour: string) =>
    `<g stroke="${colour}" stroke-width="${CREST_STROKE_WIDTH}" stroke-linecap="round">` +
    paths.map((d) => `<path d="${d}"/>`).join("") +
    `</g>`;

  return (
    `<svg aria-hidden="true" focusable="false" width="${width}" height="${height}" ` +
    `viewBox="${CREST_VIEWBOX}" fill="none" xmlns="http://www.w3.org/2000/svg">` +
    group(CREST_SHAFTS, shaft) +
    group(CREST_TIPS, tip) +
    `</svg>`
  );
}
