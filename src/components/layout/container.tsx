import type { ElementType, ReactNode } from "react";
import { cn } from "@/lib/cn";

/** Centres content at the site's max reading/content width with responsive gutters. */
export function Container({
  as: As = "div",
  className,
  children,
}: {
  as?: ElementType;
  className?: string;
  children: ReactNode;
}) {
  return (
    <As
      className={cn("mx-auto w-full max-w-[1600px] px-6 md:px-10", className)}
    >
      {children}
    </As>
  );
}
