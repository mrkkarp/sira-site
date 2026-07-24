"use client";

import { useId } from "react";
import type { ReactNode } from "react";
import { DialogPrimitive } from "@/components/ui/dialog-primitive";
import { IconButton } from "@/components/ui/icon-button";

export function Modal({
  open,
  onClose,
  title,
  children,
}: {
  open: boolean;
  onClose: () => void;
  title: string;
  children: ReactNode;
}) {
  const titleId = useId();

  return (
    <DialogPrimitive
      open={open}
      onClose={onClose}
      labelledBy={titleId}
      className="flex items-center justify-center p-6"
      panelClassName="bg-surface relative w-full max-w-md p-(--space-lg)"
    >
      <IconButton
        aria-label="Close"
        size="sm"
        className="absolute top-(--space-sm) right-(--space-sm)"
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
      <h2 id={titleId} className="type-h3 text-text mb-(--space-sm)">
        {title}
      </h2>
      {children}
    </DialogPrimitive>
  );
}
