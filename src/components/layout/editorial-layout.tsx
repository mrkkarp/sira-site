import type { ReactNode } from "react";
import { Grid } from "@/components/layout/grid";
import { cn } from "@/lib/cn";

/**
 * Asymmetric media + text block (BRAND_VISUAL_GUIDE §3.4) — deliberately
 * NOT a 50/50 split. `reverse` puts the media column on the right.
 */
export function EditorialLayout({
  media,
  children,
  reverse = false,
  className,
}: {
  media: ReactNode;
  children: ReactNode;
  reverse?: boolean;
  className?: string;
}) {
  return (
    <Grid className={cn("items-center", className)}>
      <div
        className={cn(
          "col-span-4 md:col-span-8 lg:col-span-7",
          reverse && "lg:order-2",
        )}
      >
        {media}
      </div>
      <div
        className={cn(
          "col-span-4 md:col-span-6 md:col-start-2 lg:col-span-4 lg:col-start-9",
          reverse && "lg:order-1 lg:col-start-1",
        )}
      >
        {children}
      </div>
    </Grid>
  );
}
