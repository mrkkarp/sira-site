import type { ReactNode } from "react";
import { cn } from "@/lib/cn";
import { drawingIndex } from "@/components/technical-drawing/format";
import { LeaderLine } from "@/components/technical-drawing/line";

/**
 * One row of the sheet's specification table, as a definition-list entry.
 *
 * **Must be rendered inside a `<dl>`.** The leader line lives inside the
 * `<dt>` rather than between `<dt>` and `<dd>` because a `<dl>` (or a `<div>`
 * grouping inside one) may only contain `dt` and `dd` — a bare decorative
 * `<span>` as a sibling would be invalid, and invalid list structure is
 * exactly the kind of thing that quietly degrades a definition list into
 * unlabelled text for a screen reader.
 *
 * The leader replaces the drawing's row of dot leaders, which on screen reads
 * as a 1990s restaurant menu. A continuous hairline does the same job — carry
 * the eye from a left-aligned label to a right-aligned value — and is the
 * same mark the rest of this system already uses.
 *
 * It is hidden below `sm`: on a narrow column there is no gap left to bridge,
 * and the brief is explicit that decoration gives way to content on mobile.
 * Nothing is lost, because the leader never carried information.
 */
export function SpecificationRow({
  index,
  label,
  value,
  className,
}: {
  index: number | string;
  label: ReactNode;
  value: ReactNode;
  className?: string;
}) {
  return (
    <div
      className={cn(
        "flex items-center gap-(--drawing-gap) py-(--space-2xs)",
        className,
      )}
    >
      <dt className="flex min-w-0 flex-1 items-center gap-(--drawing-gap)">
        <span
          aria-hidden="true"
          className="type-drawing-label text-drawing-text"
        >
          {drawingIndex(index)}
        </span>
        <span className="type-body-sm text-text-muted">{label}</span>
        <LeaderLine className="hidden flex-1 sm:flex" />
      </dt>
      <dd className="type-technical-value text-text shrink-0 text-right">
        {value}
      </dd>
    </div>
  );
}
