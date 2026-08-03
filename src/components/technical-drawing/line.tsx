import type { CSSProperties } from "react";
import { cn } from "@/lib/cn";
import { DrawingArrow } from "@/components/technical-drawing/arrow";

/**
 * The two line roles a technical sheet actually distinguishes.
 *
 *  - `line` — object geometry: contours, dimension lines, marker circles.
 *    Legible on its own.
 *  - `subtle` — construction geometry: guides, extension lines, leaders. The
 *    scaffolding a draughtsman leaves visible but never asks you to read.
 */
export type DrawingWeight = "line" | "subtle";

export const drawingWeightClass: Record<DrawingWeight, string> = {
  line: "bg-drawing-line",
  subtle: "bg-drawing-line-subtle",
};

/**
 * A single hairline. Always exactly `--drawing-stroke` thick, so every rule
 * in the system is the same weight no matter which component drew it.
 *
 * `draw` plays the construction animation — the line grows from its origin
 * rather than fading in, because a drawn line is drawn, not developed. It is
 * a `transform`, so it is compositor-only, and the global
 * `prefers-reduced-motion` block already collapses it to nothing.
 */
export function TechnicalLine({
  orientation = "horizontal",
  weight = "subtle",
  draw = false,
  index,
  className,
}: {
  orientation?: "horizontal" | "vertical";
  weight?: DrawingWeight;
  draw?: boolean;
  /** Position within a staggered set; feeds the shared `--i` stagger. */
  index?: number;
  className?: string;
}) {
  return (
    <span
      aria-hidden="true"
      style={
        index === undefined ? undefined : ({ "--i": index } as CSSProperties)
      }
      className={cn(
        "block",
        orientation === "horizontal"
          ? "h-(--drawing-stroke) w-full"
          : "h-full w-(--drawing-stroke)",
        drawingWeightClass[weight],
        draw &&
          (orientation === "horizontal" ? "drawing-draw-x" : "drawing-draw-y"),
        className,
      )}
    />
  );
}

/**
 * The line that runs from an annotation to the thing it annotates. On the
 * source drawing it leaves a position circle, crosses empty sheet, and lands
 * on the part with an arrowhead (or, when it lands on a face rather than an
 * edge, a dot).
 *
 * Deliberately not a fixed length: it is a flex row, so a caller puts
 * `flex-1` on it and the leader fills whatever gap is left between a label
 * and its value. That is what makes a specification list line up as a column
 * without anyone measuring anything.
 */
export function LeaderLine({
  terminator = "none",
  weight = "subtle",
  className,
}: {
  terminator?: "none" | "arrow" | "dot";
  weight?: DrawingWeight;
  className?: string;
}) {
  return (
    <span
      aria-hidden="true"
      className={cn("flex min-w-0 items-center", className)}
    >
      <span
        className={cn(
          "h-(--drawing-stroke) min-w-0 flex-1",
          drawingWeightClass[weight],
        )}
      />
      {terminator === "arrow" ? <DrawingArrow /> : null}
      {terminator === "dot" ? (
        <span className="bg-drawing-line size-1 shrink-0 rounded-full" />
      ) : null}
    </span>
  );
}
