/**
 * # TechnicalDrawingSystem
 *
 * ODUDLAB's graphic language, taken directly off its own production drawings
 * (`Варшава_опалубка` — a formwork sheet for a cast tile) rather than off a
 * general idea of what a blueprint looks like.
 *
 * ## What was actually taken from the sheet
 *
 * | On the drawing                              | Here                       |
 * | ------------------------------------------- | -------------------------- |
 * | hairline object contours                    | `TechnicalLine` (`line`)   |
 * | construction / extension lines              | `TechnicalLine` (`subtle`) |
 * | dimension lines: extension ticks, outward arrowheads, value set clear of the line | `DimensionLine`, `DimensionLabel` |
 * | leader from a position circle to the part   | `LeaderLine`               |
 * | position circles ①–⑦                        | `DrawingMarker`            |
 * | the `A` / `A-A` section cut                 | `SectionMarker`            |
 * | the `A`–`F` / `1`–`8` frame coordinates     | `CoordinateLabel`          |
 * | ruled-up construction verticals             | `TechnicalGrid`            |
 * | the `Поз. / Назва деталі / К-сть` table     | `SpecificationRow`         |
 * | the sheet frame's corners                   | `CornerRegistrationMark`, `DrawingFrame` |
 * | view captions (`Вид зверху`), title block   | `TechnicalCaption`         |
 *
 * ## What was deliberately *not* taken
 *
 * Blueprint blue, section hatching, the full title block, and the sheet-wide
 * coordinate frame. All four are unmistakably "a drawing of something else
 * pasted onto a website". The brand should read as *made by people who draw* —
 * not as a CAD screenshot. The whole layer is a tenth of the page at most.
 *
 * ## Built but not applied
 *
 * `TechnicalGrid` is part of the system and nothing renders it. It lost to
 * something the page already had: the mega-menu's construction verticals are
 * `border-l` on the real grid columns, which land on actual column edges and
 * collapse to one column on a phone as an evenly spaced overlay never could.
 * It is kept rather than deleted because applying it is a design call, not a
 * cleanup.
 *
 * `SectionMarker` was on this list until 2026-08-11, when `/projects` was
 * split into categories and needed to mark where each one begins. That is the
 * job the mark does on the sheet — it names a cut and says "what follows is a
 * different view" — and it is why the component was kept: a use eventually
 * arrived that the accordion's index-and-title row could not serve, because a
 * category heading is not a disclosure.
 *
 * ## Rules
 *
 * - **CSS and inline SVG only.** No raster line art, so every hairline stays
 *   exactly one device-independent pixel and is crisp on retina. No drawing
 *   library, no canvas: the entire system is presentational markup.
 * - **Every mark is `aria-hidden`** except `TechnicalCaption` and
 *   `SpecificationRow`, which carry real content. A line, a position or a
 *   colour never carries information on its own — dimensions and
 *   specifications are always real HTML text as well.
 * - **Tokens, not literals.** Weight, colour, marker size, gap and label size
 *   all come from the `--drawing-*` custom properties in `globals.css`.
 * - **Motion is construction, never decoration.** Lines draw, markers are
 *   placed, annotations follow. Nothing bounces or overshoots, and the global
 *   `prefers-reduced-motion` rule removes all of it.
 */

export { drawingIndex } from "@/components/technical-drawing/format";
export {
  TechnicalLine,
  LeaderLine,
  type DrawingWeight,
} from "@/components/technical-drawing/line";
export {
  DrawingMarker,
  SectionMarker,
  CornerRegistrationMark,
  type DrawingCorner,
} from "@/components/technical-drawing/marker";
export {
  DimensionLine,
  DimensionLabel,
} from "@/components/technical-drawing/dimension";
export {
  CoordinateLabel,
  TechnicalCaption,
  DrawingFrame,
  TechnicalGrid,
} from "@/components/technical-drawing/layout";
export { SpecificationRow } from "@/components/technical-drawing/specification-row";
