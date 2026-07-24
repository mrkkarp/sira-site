import type { ReactNode } from "react";
import { cn } from "@/lib/cn";

/** Breaks a section out of `Container`'s max-width to span the full viewport. */
export function FullBleed({
  className,
  children,
}: {
  className?: string;
  children: ReactNode;
}) {
  return (
    <div
      className={cn("relative left-1/2 w-screen -translate-x-1/2", className)}
    >
      {children}
    </div>
  );
}
