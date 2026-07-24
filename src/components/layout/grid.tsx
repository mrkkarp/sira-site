import type { ReactNode } from "react";
import { cn } from "@/lib/cn";

/**
 * The site grid: 4 columns on mobile, 8 on tablet, 12 on desktop. Children
 * use ordinary Tailwind `col-span-*`/`md:col-span-*`/`lg:col-span-*` to
 * position themselves — this component only sets up the tracks.
 */
export function Grid({
  className,
  children,
}: {
  className?: string;
  children: ReactNode;
}) {
  return (
    <div
      className={cn(
        "grid grid-cols-4 gap-x-4 gap-y-8 md:grid-cols-8 md:gap-x-6 lg:grid-cols-12 lg:gap-x-8",
        className,
      )}
    >
      {children}
    </div>
  );
}
