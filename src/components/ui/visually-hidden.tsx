import type { ComponentPropsWithoutRef, ElementType, ReactNode } from "react";

/** Visually hides content while keeping it available to assistive tech. */
export function VisuallyHidden<T extends ElementType = "span">({
  as,
  children,
  ...rest
}: {
  as?: T;
  children: ReactNode;
} & Omit<ComponentPropsWithoutRef<T>, "as" | "children">) {
  const As = (as ?? "span") as ElementType;
  return (
    <As
      className="absolute h-px w-px overflow-hidden border-0 p-0 whitespace-nowrap [clip:rect(0,0,0,0)]"
      {...rest}
    >
      {children}
    </As>
  );
}
