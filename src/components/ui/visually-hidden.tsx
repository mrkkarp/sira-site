import type { ElementType, ReactNode } from "react";

/** Visually hides content while keeping it available to assistive tech. */
export function VisuallyHidden({
  as: As = "span",
  children,
}: {
  as?: ElementType;
  children: ReactNode;
}) {
  return (
    <As className="absolute h-px w-px overflow-hidden border-0 p-0 whitespace-nowrap [clip:rect(0,0,0,0)]">
      {children}
    </As>
  );
}
