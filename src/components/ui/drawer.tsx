"use client";

import { useId } from "react";
import type { ReactNode } from "react";
import { DialogPrimitive } from "@/components/ui/dialog-primitive";
import { IconButton } from "@/components/ui/icon-button";
import { cn } from "@/lib/cn";

export function Drawer({
  open,
  onClose,
  title,
  side = "right",
  children,
}: {
  open: boolean;
  onClose: () => void;
  title: string;
  side?: "left" | "right";
  children: ReactNode;
}) {
  const titleId = useId();

  return (
    <DialogPrimitive
      open={open}
      onClose={onClose}
      labelledBy={titleId}
      panelClassName={cn(
        "bg-surface absolute top-0 h-full w-full max-w-md overflow-y-auto p-(--space-lg)",
        side === "right" ? "right-0" : "left-0",
      )}
    >
      <div className="mb-(--space-sm) flex items-center justify-between">
        <h2 id={titleId} className="type-h3 text-text">
          {title}
        </h2>
        <IconButton
          aria-label="Close"
          size="sm"
          onClick={onClose}
          icon={
            <svg aria-hidden="true" viewBox="0 0 24 24" className="h-4 w-4">
              <path
                d="M6 6l12 12M18 6L6 18"
                stroke="currentColor"
                strokeWidth="2"
              />
            </svg>
          }
        />
      </div>
      {children}
    </DialogPrimitive>
  );
}
