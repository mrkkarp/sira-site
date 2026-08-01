"use client";

import { useEffect, useId, useRef } from "react";
import type { ReactNode } from "react";
import { cn } from "@/lib/cn";

/**
 * One trigger + panel pair. Only one mega-menu is open at a time — the
 * parent `Header` owns `openKey`/`onOpenChange` so opening one closes any
 * other. Opens on click (not hover, per the brief), traps focus, closes on
 * Escape/outside-click, and restores focus to the trigger on close.
 */
export function MegaMenu({
  menuKey,
  openKey,
  onOpenChange,
  label,
  width = "auto",
  className,
  triggerClassName,
  children,
}: {
  menuKey: string;
  openKey: string | null;
  onOpenChange: (key: string | null) => void;
  label: string;
  width?: "auto" | "full";
  /** Applied to the positioning root — the header uses it to make this
   *  trigger one bordered cell in the nav row. */
  className?: string;
  /** Applied to the trigger button. The header passes the cell's own
   *  padding/alignment plus the inverted fill it uses for the open item, so
   *  a mega-menu trigger and a plain nav link are visually identical cells. */
  triggerClassName?: string;
  children: ReactNode;
}) {
  const isOpen = openKey === menuKey;
  const triggerRef = useRef<HTMLButtonElement>(null);
  const panelRef = useRef<HTMLDivElement>(null);
  const rootRef = useRef<HTMLDivElement>(null);
  const panelId = useId();

  useEffect(() => {
    if (!isOpen) return;

    const panel = panelRef.current;
    const focusable = panel?.querySelectorAll<HTMLElement>(
      'a[href], button:not([disabled]), [tabindex]:not([tabindex="-1"])',
    );
    focusable?.[0]?.focus();

    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") {
        onOpenChange(null);
        triggerRef.current?.focus();
        return;
      }
      if (event.key !== "Tab" || !focusable || focusable.length === 0) return;
      const first = focusable[0];
      const last = focusable[focusable.length - 1];
      if (event.shiftKey && document.activeElement === first) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault();
        first.focus();
      }
    }

    function handlePointerDown(event: PointerEvent) {
      if (rootRef.current && !rootRef.current.contains(event.target as Node)) {
        onOpenChange(null);
      }
    }

    document.addEventListener("keydown", handleKeyDown);
    document.addEventListener("pointerdown", handlePointerDown);
    return () => {
      document.removeEventListener("keydown", handleKeyDown);
      document.removeEventListener("pointerdown", handlePointerDown);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOpen]);

  return (
    <div ref={rootRef} className={cn("relative", className)}>
      <button
        ref={triggerRef}
        type="button"
        aria-expanded={isOpen}
        aria-controls={panelId}
        onClick={() => onOpenChange(isOpen ? null : menuKey)}
        className={cn(
          "type-nav flex items-center gap-(--space-3xs)",
          triggerClassName ?? "py-(--space-xs)",
        )}
      >
        {label}
        <svg
          aria-hidden="true"
          viewBox="0 0 16 16"
          className={cn(
            "h-3 w-3 transition-transform duration-(--duration-fast)",
            isOpen && "rotate-180",
          )}
        >
          <path
            d="M4 6l4 4 4-4"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.5"
          />
        </svg>
      </button>

      {isOpen ? (
        <>
          <div
            className="fixed inset-0 z-30 bg-black/20"
            style={{ top: "var(--header-stack-height, 0px)" }}
            aria-hidden="true"
          />
          <div
            ref={panelRef}
            id={panelId}
            role="region"
            aria-label={label}
            // Close the menu the instant an internal link inside the panel is
            // activated, rather than waiting for the route to commit — this
            // keeps the dropdown from lingering over the page during a pending
            // navigation. The parent `Header` also closes every overlay on
            // `pathname` change (covering Back/Forward), so this is the
            // fast-path, not the only guard. Delegated so it works for every
            // link the panel's children render without threading a callback.
            onClick={(event) => {
              if ((event.target as HTMLElement).closest("a[href]")) {
                onOpenChange(null);
              }
            }}
            style={
              width === "full"
                ? { top: "var(--header-stack-height, 0px)" }
                : undefined
            }
            className={cn(
              "bg-surface border-border z-40 border",
              width === "full"
                ? "fixed inset-x-0"
                : "absolute top-full mt-2 min-w-[280px]",
            )}
          >
            {children}
          </div>
        </>
      ) : null}
    </div>
  );
}
