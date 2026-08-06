/**
 * # Brand layer
 *
 * The ODUDLAB identity as it appears *inside* the interface: the terracotta
 * accent, and the hoopoe reduced to a mark.
 *
 * ## Why this is so small
 *
 * The site already has a non-neutral graphic layer — the technical-drawing
 * system — and that layer's own documentation budgets it at "a tenth of the
 * page at most". The brief for this work asks for 90% clean minimal site /
 * 10% brand accent. Those are the same tenth. Adding a second decorative
 * layer beside the first would have made it a fifth, which is how a restrained
 * site quietly becomes a busy one.
 *
 * So the strategy is not "add brand marks", it is **colour the marks that are
 * already there**. The rule under a product card, the rule across a colour
 * plate, the rule under a mega-menu category, the eyebrow above every section
 * heading, the "на замовлення" badge on every card, the ring around the chosen
 * colour, the position numbers down the footer columns — all of those existed
 * in monochrome before this. Giving them the brand's colour adds recognition at
 * zero added visual density, which is the only way to spend a tenth of the page
 * twice.
 *
 * `BrandAccentLine` is the clearest case: the mega-menu had this exact markup
 * written out inline, character for character, before the component existed.
 * It was not extracted to enable the brand work — the brand work is what
 * revealed the duplication. `BrandEyebrow` turned out to be the same story at
 * twenty call sites instead of one.
 *
 * ## What the first pass got wrong
 *
 * It shipped two components and stopped, on the argument below — that the other
 * six would each be a new mark competing with an existing one. The argument was
 * sound and the result was not: the owner's verdict on it was *"єдине що
 * помітно це теракотові лінії. мало"*, and he was right. Nearly every accent in
 * that pass was a **hover** state. Each was individually defensible; together
 * they meant the site *at rest* — the site people actually look at — was as
 * monochrome as it had been before any of the work.
 *
 * The lesson is narrow and worth keeping: "something already does this job" is
 * only an argument against a new component when the thing that already does the
 * job is doing it **in the brand's voice**. A grey eyebrow is not. So the table
 * below now records which rows survived that correction and which did not.
 *
 * | Asked for            | Resolution                                          |
 * | -------------------- | --------------------------------------------------- |
 * | `BrandSectionLabel`  | **built**, as `BrandEyebrow` — see its own note      |
 * | `BrandMarker`        | `DrawingMarker` — position circles, already themed   |
 * | `TerracottaDivider`  | `BrandAccentLine`, and `Divider`/`TechnicalLine`     |
 * | `BrandStamp`         | the footer's origin line, already in drawing voice   |
 * | `BrandEmptyState`    | the 404 and empty states take `HoopoeCrest size="lg"` |
 * | `HoopoeDetail` / `FeatherMotif` | one motif, so one component: `HoopoeCrest` |
 *
 * The four still-declined rows are declined for the original reason, which
 * survives: `DrawingMarker` and `TechnicalLine` were *already recoloured*, so a
 * parallel `BrandMarker` would be a second component drawing the same mark in
 * the same colour. That is different from the eyebrow, which was left grey.
 *
 * Building all eight regardless would have repeated a mistake this codebase has
 * already made once and written down: `SectionMarker` and `TechnicalGrid` were
 * built, never applied, and still sit in the drawing system unused because
 * something the page already had turned out to be better.
 *
 * ## Rules
 *
 * - **CSS and inline SVG only** — same as the drawing system. No raster art,
 *   no icon library, nothing that costs a request.
 * - **Every mark is `aria-hidden`.** The accent is never the only carrier of a
 *   state, and the crest is never the only carrier of the brand's name.
 * - **Tokens, not literals.** Every colour comes from the `--brand-accent-*`
 *   custom properties, whose contrast is proven by
 *   `scripts/check-brand-contrast.ts` and re-checked by `npm test`.
 */

export { HoopoeCrest } from "@/components/brand/crest";
export { BrandAccentLine } from "@/components/brand/accent-line";
export { BrandEyebrow } from "@/components/brand/eyebrow";
