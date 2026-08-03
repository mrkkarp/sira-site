import { cn } from "@/lib/cn";

export type ArrowDirection = "left" | "right" | "up" | "down";

const rotation: Record<ArrowDirection, string> = {
  right: "",
  left: "rotate-180",
  down: "rotate-90",
  up: "-rotate-90",
};

/**
 * The terminator on a dimension or leader line. Internal to this system — a
 * bare arrow is never meaningful on its own, so it is not exported from the
 * barrel.
 *
 * Proportions are taken from the source drawing: roughly 3:1, filled, with a
 * slight waist at the base so it reads as a drawn arrowhead rather than a
 * play button. SVG rather than a CSS border-triangle because a border
 * triangle can only be isoceles-in-a-box, which at 3:1 leaves the two long
 * edges visibly stepped.
 */
export function DrawingArrow({
  direction = "right",
  className,
}: {
  direction?: ArrowDirection;
  className?: string;
}) {
  return (
    <svg
      aria-hidden="true"
      viewBox="0 0 9 6"
      // Square box on purpose. The glyph is 3:2 and letterboxes inside it, so
      // a 90° rotation for the vertical directions lands on exactly the same
      // centre and the same apparent size — a box matched to the glyph's own
      // ratio would swap width for height on rotation and render the vertical
      // arrows visibly smaller than the horizontal ones.
      className={cn(
        "text-drawing-line size-2.5 shrink-0",
        rotation[direction],
        className,
      )}
    >
      <path d="M0 0.6 L9 3 L0 5.4 L1.4 3 Z" fill="currentColor" />
    </svg>
  );
}
