import type { CSSProperties, ReactNode } from "react";
import { cn } from "@/lib/cn";
import { drawingIndex } from "@/components/technical-drawing/format";

/**
 * The position circle: a hairline ring with a part number in it, the single
 * most recognisable mark on an ODUDLAB sheet. On the drawing it is what a
 * leader line hangs off; here it numbers a category, a colour option or a
 * gallery frame.
 *
 * `filled` is the selected state — ink circle, paper numeral. It borrows the
 * bar's existing active-cell treatment (`bg-text`/`text-background`) rather
 * than filling with `--drawing-line`, whose warm taupe would put an
 * unreadable numeral inside a mark whose whole job is to be read at a
 * glance.
 *
 * The numeral is `aria-hidden` in every current use: it restates DOM order,
 * which assistive tech already conveys. It is only a ring around an ordinal,
 * never the only place a fact lives.
 */
export function DrawingMarker({
  children,
  filled = false,
  animate = false,
  index,
  className,
}: {
  children: ReactNode;
  filled?: boolean;
  /** Play the "marker is placed" construction beat. */
  animate?: boolean;
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
        "type-drawing-label inline-flex shrink-0 items-center justify-center rounded-full border transition-colors duration-(--duration-normal) ease-(--ease-nav)",
        "size-(--drawing-marker-size)",
        filled
          ? "bg-text text-background border-text"
          : "border-drawing-line text-drawing-text",
        animate && "drawing-mark",
        className,
      )}
    >
      {typeof children === "number" ? drawingIndex(children) : children}
    </span>
  );
}

/**
 * The section-cut label (`A`, `A-A` on the sheet) reinterpreted as the site's
 * one section-heading mark: index, a short rule, then the title.
 *
 * This is deliberately the *only* section-marking system on the site. The
 * brief allows either letters or numbers; numbers won because every other
 * counted thing here — categories, specification rows, gallery frames,
 * colour options — is already numbered, and two parallel schemes would read
 * as an accident rather than a convention.
 *
 * **Nothing uses it today.** The site does have one section-marking
 * convention and it is this anatomy, but it is rendered inline by
 * `Accordion`, which needs the index and the title at opposite ends of a
 * full-width trigger row and needs both to change colour on the dark footer —
 * neither of which this fixed-ink inline mark can do. Numbering the homepage
 * section eyebrows instead was tried and reverted: only three of eight
 * sections route through `SectionHeader`, so it marked some and not others,
 * and marking all of them would have put a rule on error pages and the mobile
 * menu too — the "drawing elements every centimetre" the brief rules out.
 *
 * Renders a `span`, so a caller is free to put it inside whatever heading
 * level the document outline actually calls for.
 */
export function SectionMarker({
  index,
  children,
  className,
}: {
  index: number | string;
  children?: ReactNode;
  className?: string;
}) {
  return (
    <span
      className={cn("inline-flex items-center gap-(--drawing-gap)", className)}
    >
      <span aria-hidden="true" className="type-drawing-label text-drawing-text">
        {drawingIndex(index)}
      </span>
      <span
        aria-hidden="true"
        className="bg-drawing-line h-(--drawing-stroke) w-(--space-md) shrink-0"
      />
      {children}
    </span>
  );
}

const cornerClass = {
  tl: "top-0 left-0 border-t border-l",
  tr: "top-0 right-0 border-t border-r",
  bl: "bottom-0 left-0 border-b border-l",
  br: "bottom-0 right-0 border-b border-r",
} as const;

export type DrawingCorner = keyof typeof cornerClass;

/**
 * One L-shaped registration tick. Absolutely positioned, so the parent must
 * establish a containing block; `DrawingFrame` renders all four.
 *
 * `pointer-events-none` matters: these sit inside interactive frames (the
 * mega-menu preview, a gallery figure) and an 8px square swallowing clicks at
 * each corner of an image would be an invisible dead zone.
 */
export function CornerRegistrationMark({
  corner,
  className,
}: {
  corner: DrawingCorner;
  className?: string;
}) {
  return (
    <span
      aria-hidden="true"
      className={cn(
        "border-drawing-line pointer-events-none absolute size-2",
        cornerClass[corner],
        className,
      )}
    />
  );
}
