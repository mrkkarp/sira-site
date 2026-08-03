import type { ReactNode } from "react";
import { cn } from "@/lib/cn";
import { drawingIndex } from "@/components/technical-drawing/format";
import { CornerRegistrationMark } from "@/components/technical-drawing/marker";

/**
 * The sheet's marginal annotation: the `A`–`F` and `1`–`8` coordinates in the
 * frame band, a view name, a sheet number. Small, uppercase, tracked out,
 * always in the construction voice — never a heading.
 *
 * `aria-hidden`, because a coordinate is a way of pointing at a place on a
 * sheet. On a web page the place is simply where the reader already is.
 */
export function CoordinateLabel({
  children,
  className,
}: {
  children: ReactNode;
  className?: string;
}) {
  return (
    <span
      aria-hidden="true"
      className={cn("type-drawing-label text-drawing-text", className)}
    >
      {children}
    </span>
  );
}

/**
 * The caption set under a view on the sheet (`Вид зверху`, `A-A`). Unlike
 * every other mark in this system this one is **not** `aria-hidden`: a
 * caption is content. When `index` is given it is rendered in the sheet's own
 * numbering, e.g. `01 — ВИГЛЯД`.
 */
export function TechnicalCaption({
  index,
  children,
  className,
}: {
  index?: number | string;
  children: ReactNode;
  className?: string;
}) {
  return (
    <p className={cn("type-drawing-label text-drawing-text", className)}>
      {index === undefined ? null : `${drawingIndex(index)} — `}
      {children}
    </p>
  );
}

/**
 * The lightest possible frame: four registration ticks and, optionally, the
 * hairline border between them.
 *
 * Corners-only is the default because that is what keeps this premium rather
 * than clerical. A full box around a product photo turns the photo into a
 * table cell; four 8px ticks say "this is a plate on a sheet" and then get
 * out of the way. The border, when asked for, is deliberately a weight
 * *below* the ticks — on a real sheet the frame is construction and the
 * registration marks are what you align to.
 */
export function DrawingFrame({
  children,
  bordered = false,
  className,
}: {
  children?: ReactNode;
  bordered?: boolean;
  className?: string;
}) {
  return (
    <div
      className={cn(
        "relative",
        bordered && "border-drawing-line-subtle border",
        className,
      )}
    >
      {children}
      <CornerRegistrationMark corner="tl" />
      <CornerRegistrationMark corner="tr" />
      <CornerRegistrationMark corner="bl" />
      <CornerRegistrationMark corner="br" />
    </div>
  );
}

/**
 * Vertical construction guides — the faint verticals a draughtsman rules up
 * before placing anything on them.
 *
 * A decorative layer over its parent, so it costs the parent nothing but
 * `position: relative`. Guides are drawn between the columns, never at the
 * outer edges, so it reads as division rather than as a box.
 *
 * Use this sparingly, and never as a page background. It is the one primitive
 * here that can tip the whole design from "made by people who draw" into
 * "CAD wallpaper", which is exactly what the brief rules out.
 *
 * **Nothing uses it today.** Where the site is ruled up between groups — the
 * mega-menu — the guides are `border-l` on the real grid columns instead, so
 * a guide always lands on an actual column edge and follows the layout down
 * to one column on a phone, which an evenly spaced overlay cannot. Kept
 * because the brief asks for the primitive; applied nowhere because the
 * places that want guides are better served by the columns they already have.
 */
export function TechnicalGrid({
  columns = 4,
  className,
}: {
  columns?: number;
  className?: string;
}) {
  return (
    <span
      aria-hidden="true"
      className={cn("pointer-events-none absolute inset-0 flex", className)}
    >
      {Array.from({ length: columns }, (_, index) => (
        <span
          key={index}
          className="border-drawing-line-subtle flex-1 border-r last:border-r-0"
        />
      ))}
    </span>
  );
}
