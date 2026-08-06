import { cn } from "@/lib/cn";
import {
  CREST_SHAFTS,
  CREST_STROKE_WIDTH,
  CREST_TIPS,
  CREST_VIEWBOX,
} from "@/lib/hoopoe-crest";

/**
 * The hoopoe's crest, reduced to the five strokes that make it recognisable.
 *
 * ## Why the crest and not the bird
 *
 * The logo is a hoopoe head in engraved line-work: crest, eye, and a long
 * tapering beak. Three things could have been lifted from it, and only one
 * survives being shrunk to 20px and repeated:
 *
 *  - **The whole head** is the logo. Reusing it as an ornament is the "literal
 *    logo in every block" the brief rules out, and it competes with the real
 *    one in the header.
 *  - **The beak** is the most distinctive single feature, but out of context a
 *    lone tapering curve is just a curve — it reads as a swoosh, which is the
 *    one thing a premium mark must never read as.
 *  - **The crest** is a fan of tapered feathers, and a fan of tapered strokes
 *    is still a fan of tapered strokes at any size. It is also the only part
 *    of the bird that is *already* drawn the way this site draws everything
 *    else: discrete hairlines, no fill, no shading.
 *
 * So the crest is the motif, and it is built out of the vocabulary the
 * technical-drawing system already uses — strokes and ticks — rather than
 * imported as artwork. That is what keeps it from reading as clip art pasted
 * onto a drawing.
 *
 * ## The dark tips
 *
 * On the real bird, and in the logo, each crest feather is pale along its
 * shaft and banded dark at the tip. That detail is why this is two paths and
 * not one: the shaft takes the drawing system's own line colour, and only the
 * last third takes the brand accent. The terracotta is therefore doing what
 * the bird's own markings do — landing on the tips — instead of being poured
 * over the whole mark. Every feather is split at the same 70/30 point, so the
 * band sits on an arc rather than at five different heights.
 *
 * The site's hatching is deliberately *not* borrowed (the drawing system's
 * index records why: hatching reads as a CAD screenshot). Five discrete
 * strokes are a tick vocabulary, not a hatch.
 *
 * ## Rules
 *
 * Always `aria-hidden`. It is never the only carrier of anything — every place
 * it appears already names the brand in real text beside it, so a screen
 * reader loses nothing by skipping it, and announcing "hoopoe crest" next to
 * the word ODUDLAB would be noise.
 *
 * Inline SVG with no fill and no filter, so it costs no request, no layout and
 * no paint worth measuring.
 *
 * The stroke scales with the mark rather than being pinned to a hairline with
 * `vector-effect`. A hairline that stays 1.2px while the mark triples reads as
 * five scratches on a large empty box; an engraved mark gets heavier as it gets
 * bigger, because the tool that cut it did.
 */
/**
 * Three sizes, and the smallest is no longer the default.
 *
 * The mark first shipped at `sm` everywhere, and at 28px wide the two-tone
 * banding is below the threshold where two colours read as two colours — the
 * whole thing greys into a smudge, and a smudge is not recognition. `md` is
 * the size at which the terracotta tips are unmistakably terracotta, so it is
 * what a caller gets by default; `sm` stays for the one place that is genuinely
 * tight, and `lg` is for a mark that has a block to itself.
 */
const sizeClass = {
  sm: "h-[1.0625rem] w-7", // 28 × 17
  md: "h-[1.625rem] w-11", // 44 × 26
  lg: "h-[2.4375rem] w-16", // 64 × 39
} as const;

export function HoopoeCrest({
  tone = "light",
  size = "md",
  className,
}: {
  /** `light` for the page surfaces, `dark` for the footer band — the accent
   *  has to change with the ground, not just the shaft. */
  tone?: "light" | "dark";
  size?: keyof typeof sizeClass;
  className?: string;
}) {
  const shaft = tone === "dark" ? "text-background/45" : "text-drawing-line";
  const tip =
    tone === "dark" ? "text-brand-accent-on-dark" : "text-brand-accent";

  return (
    <svg
      aria-hidden="true"
      viewBox={CREST_VIEWBOX}
      fill="none"
      className={cn("shrink-0", sizeClass[size], className)}
    >
      {/* Shafts — base to two thirds, in the drawing layer's own line colour,
          so the mark sits at the same weight as every rule near it.

          The five bases sit on a shallow arc rather than on one point. Fanning
          them all out of a single origin was tried first and renders as a
          solid wedge where the strokes overlap — the feathers stop being five
          things and become one blot with prongs. On the bird they rise from
          the width of the crown, and giving each its own base is both truer
          and the only version that stays five strokes at 28px.

          The coordinates live in `@/lib/hoopoe-crest` because the proxy's
          status page has to draw the same mark without a stylesheet. */}
      <g
        className={shaft}
        stroke="currentColor"
        strokeWidth={CREST_STROKE_WIDTH}
        strokeLinecap="round"
      >
        {CREST_SHAFTS.map((d) => (
          <path key={d} d={d} />
        ))}
      </g>
      {/* Tips — the banded ends, at exactly the shaft's weight.
          Thickening them was tried twice (1.6, then 1.45) and both times the
          round cap turned each feather into a matchstick: a thin stick with a
          bulb on the end is a different object, and five of them are a
          different object again. Holding the width constant means a feather is
          one continuous stroke that simply changes colour two thirds along —
          which is what the banding on the real bird does, and what an engraver
          would do with it. */}
      <g
        className={tip}
        stroke="currentColor"
        strokeWidth={CREST_STROKE_WIDTH}
        strokeLinecap="round"
      >
        {CREST_TIPS.map((d) => (
          <path key={d} d={d} />
        ))}
      </g>
    </svg>
  );
}
