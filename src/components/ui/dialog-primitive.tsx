"use client";

import { useRef } from "react";
import type { ReactNode } from "react";
import { cn } from "@/lib/cn";
import { useDialogBehaviour } from "./use-dialog-behaviour";

/**
 * Shared overlay + focus-management behaviour for Modal and Drawer — do not
 * duplicate this logic in either of them, extend this instead.
 *
 * The focus trap, Escape handling, scroll lock and focus restore now live in
 * `useDialogBehaviour`, shared with the two overlays that cannot use this
 * component's markup (`MobileMenu`, `SearchDrawer`). This still owns the
 * backdrop and panel structure.
 */
export function DialogPrimitive({
  open,
  onClose,
  labelledBy,
  className,
  panelClassName,
  children,
}: {
  open: boolean;
  onClose: () => void;
  labelledBy: string;
  className?: string;
  panelClassName?: string;
  children: ReactNode;
}) {
  const panelRef = useRef<HTMLDivElement>(null);

  useDialogBehaviour({ open, onClose, panelRef });

  if (!open) return null;

  return (
    <div className={cn("fixed inset-0 z-50", className)}>
      <div
        className="absolute inset-0 bg-black/40"
        onClick={onClose}
        aria-hidden="true"
      />
      <div
        ref={panelRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby={labelledBy}
        className={panelClassName}
      >
        {children}
      </div>
    </div>
  );
}
