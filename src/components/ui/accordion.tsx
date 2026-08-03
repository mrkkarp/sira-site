"use client";

import { useId, useState } from "react";
import type { ReactNode } from "react";
import { cn } from "@/lib/cn";
import { drawingIndex } from "@/components/technical-drawing";

export type AccordionItemData = {
  id: string;
  trigger: ReactNode;
  content: ReactNode;
};

/**
 * The drawing primitives pin the light-theme ink, but this accordion is used
 * on both the light product page and the dark footer. Rendering the light set
 * on the footer put the section headings at ~1:1 against it — the headings
 * were there, just invisible. The caller names the surface instead.
 */
const toneStyles = {
  light: {
    rule: "border-drawing-line-subtle",
    text: "text-text",
    ink: "bg-text",
    index: "text-drawing-text",
  },
  onDark: {
    rule: "border-white/10",
    text: "text-background",
    ink: "bg-background",
    index: "text-background/50",
  },
} as const;

/**
 * The open/closed control, drawn rather than typed: a horizontal bar that is
 * always there and a vertical one that collapses into it.
 *
 * The `+` used to become a `×` by rotating 45°, which reads as "close this"
 * — a dismissal, not a section that is currently drawn open. A `+` that
 * becomes a `—` is what a drawing's index does, and the change is a single
 * `scaleY`, so it composites and the global reduced-motion rule already
 * removes the transition.
 */
function ToggleMark({ open, ink }: { open: boolean; ink: string }) {
  return (
    <span aria-hidden="true" className="relative block size-3 shrink-0">
      <span
        className={cn(
          "absolute inset-x-0 top-1/2 h-(--drawing-stroke) -translate-y-1/2",
          ink,
        )}
      />
      <span
        className={cn(
          "absolute inset-y-0 left-1/2 w-(--drawing-stroke) -translate-x-1/2 transition-transform duration-(--duration-normal) ease-(--ease-nav)",
          ink,
          open ? "scale-y-0" : "scale-y-100",
        )}
      />
    </span>
  );
}

/**
 * Sections of a sheet rather than stacked cards: a hairline rule above and
 * below each row, the section's position number in the margin when the caller
 * asks for one, and the row's own rule drawn across in ink while it is open.
 *
 * The ink overlay reuses the rule the row already has instead of adding a
 * second line — the brief's "the technical line expands smoothly on open"
 * without another mark on the page. It is a `scaleX`, so it is one composited
 * property.
 *
 * `indexed` is opt-in and off by default, so a caller that just wants a
 * disclosure widget does not inherit a sheet's numbering. It is `aria-hidden`
 * wherever it appears: the list is already ordered, so the number is a way of
 * *pointing at* a row, and the accessible name of the trigger stays exactly
 * the section title.
 */
export function Accordion({
  items,
  allowMultiple = false,
  defaultOpenIds = [],
  indexed = false,
  tone = "light",
}: {
  items: AccordionItemData[];
  allowMultiple?: boolean;
  defaultOpenIds?: string[];
  indexed?: boolean;
  /** Which surface this sits on. `onDark` is the footer's near-black band. */
  tone?: keyof typeof toneStyles;
}) {
  const [openIds, setOpenIds] = useState<Set<string>>(new Set(defaultOpenIds));
  const baseId = useId();
  const style = toneStyles[tone];

  function toggle(id: string) {
    setOpenIds((prev) => {
      const next = allowMultiple ? new Set(prev) : new Set<string>();
      if (prev.has(id)) {
        if (!allowMultiple) return new Set();
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  }

  return (
    <div className={cn("border-t", style.rule)}>
      {items.map((item, index) => {
        const isOpen = openIds.has(item.id);
        const triggerId = `${baseId}-${item.id}-trigger`;
        const panelId = `${baseId}-${item.id}-panel`;
        return (
          <div key={item.id} className={cn("relative border-b", style.rule)}>
            <span
              aria-hidden="true"
              className={cn(
                "absolute inset-x-0 bottom-0 h-(--drawing-stroke) origin-left transition-transform duration-(--duration-normal) ease-(--ease-nav)",
                style.ink,
                isOpen ? "scale-x-100" : "scale-x-0",
              )}
            />
            <h3>
              <button
                id={triggerId}
                type="button"
                aria-expanded={isOpen}
                aria-controls={panelId}
                onClick={() => toggle(item.id)}
                className={cn(
                  "type-h4 flex w-full items-center justify-between gap-(--space-sm) py-(--space-sm) text-left",
                  style.text,
                )}
              >
                <span className="flex min-w-0 items-center gap-(--drawing-gap)">
                  {indexed ? (
                    <span
                      aria-hidden="true"
                      className={cn("type-drawing-label", style.index)}
                    >
                      {drawingIndex(index + 1)}
                    </span>
                  ) : null}
                  {item.trigger}
                </span>
                <ToggleMark open={isOpen} ink={style.ink} />
              </button>
            </h3>
            {isOpen ? (
              <div
                id={panelId}
                role="region"
                aria-labelledby={triggerId}
                className="type-body text-text-muted pb-(--space-sm)"
              >
                {item.content}
              </div>
            ) : null}
          </div>
        );
      })}
    </div>
  );
}
