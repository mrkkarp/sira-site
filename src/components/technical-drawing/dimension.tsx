import type { ReactNode } from "react";
import { cn } from "@/lib/cn";
import { DrawingArrow } from "@/components/technical-drawing/arrow";

/**
 * The measured value itself. **Real, selectable HTML text** — never painted
 * into the SVG and never a background image, because a dimension is a fact
 * about the product, and a fact that only exists as vector geometry is a fact
 * a screen reader cannot read.
 *
 * The vertical variant uses `writing-mode` rather than a `rotate()`: a
 * rotated element keeps its unrotated box, so the flex row beside it would
 * still be laid out around a wide horizontal label and the geometry would sit
 * in the wrong place. `writing-mode` re-measures the box.
 */
export function DimensionLabel({
  children,
  orientation = "horizontal",
  className,
}: {
  children: ReactNode;
  orientation?: "horizontal" | "vertical";
  className?: string;
}) {
  return (
    <span
      className={cn(
        "type-technical-value text-text whitespace-nowrap",
        orientation === "vertical" && "rotate-180 [writing-mode:vertical-rl]",
        className,
      )}
    >
      {children}
    </span>
  );
}

/**
 * A dimension: extension ticks at both ends, arrowheads turned outward to
 * touch them, and the value set clear of the line — the exact anatomy on the
 * ODUDLAB sheet, where `596` sits above its line and the vertical `596` sits
 * beside its own, turned to read bottom-to-top.
 *
 * The line is CSS, not SVG. A dimension has to span whatever width its
 * container happens to be, and an SVG stretched to an arbitrary width either
 * distorts its arrowheads (`preserveAspectRatio="none"`) or refuses to fill
 * the space. Flexbox spans anything, and a 1px background bar is crisp at
 * every device pixel ratio without a single half-pixel correction.
 *
 * Geometry is `aria-hidden`; only the label is in the accessibility tree.
 */
export function DimensionLine({
  children,
  orientation = "horizontal",
  className,
}: {
  /** The measured value, e.g. "850 мм". */
  children: ReactNode;
  orientation?: "horizontal" | "vertical";
  className?: string;
}) {
  if (orientation === "vertical") {
    return (
      <div className={cn("flex items-center gap-(--space-3xs)", className)}>
        <DimensionLabel orientation="vertical">{children}</DimensionLabel>
        <span
          aria-hidden="true"
          className="relative flex h-full flex-col items-center"
        >
          <span className="bg-drawing-line absolute top-0 left-1/2 h-(--drawing-stroke) w-2 -translate-x-1/2" />
          <DrawingArrow direction="up" />
          <span className="bg-drawing-line w-(--drawing-stroke) flex-1" />
          <DrawingArrow direction="down" />
          <span className="bg-drawing-line absolute bottom-0 left-1/2 h-(--drawing-stroke) w-2 -translate-x-1/2" />
        </span>
      </div>
    );
  }

  return (
    <div
      className={cn("flex flex-col items-center gap-(--space-3xs)", className)}
    >
      <DimensionLabel>{children}</DimensionLabel>
      <span aria-hidden="true" className="relative flex w-full items-center">
        <span className="bg-drawing-line absolute top-1/2 left-0 h-2 w-(--drawing-stroke) -translate-y-1/2" />
        <DrawingArrow direction="left" />
        <span className="bg-drawing-line h-(--drawing-stroke) flex-1" />
        <DrawingArrow direction="right" />
        <span className="bg-drawing-line absolute top-1/2 right-0 h-2 w-(--drawing-stroke) -translate-y-1/2" />
      </span>
    </div>
  );
}
