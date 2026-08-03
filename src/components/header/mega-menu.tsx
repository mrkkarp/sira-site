"use client";

import { useCallback, useEffect, useId, useRef } from "react";
import type { ReactNode } from "react";
import { cn } from "@/lib/cn";
import { RollingLabel } from "@/components/header/rolling-label";

/** How long the pointer must rest on the trigger before the panel opens, and
 *  how long it may leave the whole menu before the panel closes. The open
 *  delay kills accidental opens when the pointer merely crosses the nav; the
 *  (longer) close delay forgives the diagonal move from trigger to panel. */
const HOVER_OPEN_DELAY = 90;
const HOVER_CLOSE_DELAY = 180;

/**
 * One trigger + one full-width panel. Only one mega-menu is open at a time —
 * the parent `Header` owns `openKey`/`onOpenChange`, so opening one closes
 * any other and a single route-change effect can close every overlay at once.
 *
 * ## Why the panel is always mounted
 *
 * Unmounting on close makes an exit animation impossible: React tears the
 * node out before any transition can run, so the panel would vanish instead
 * of retracting. It stays in the DOM and is driven by `data-state`, with
 * `inert` + `aria-hidden` while closed. `inert` is doing real work — it takes
 * the panel out of the tab order, blocks pointer events, and removes it from
 * the accessibility tree — so a closed panel is genuinely unreachable rather
 * than merely invisible. (It is also why `header.test.tsx` can still assert
 * that a catalog link is *not in the document* after a route change: Testing
 * Library's role queries skip `aria-hidden` subtrees.)
 *
 * ## Disclosure, not modal
 *
 * This is an expandable disclosure, so there is deliberately **no focus
 * trap**: the panel follows the trigger in DOM order, so Tab walks into it
 * and out the far side naturally, and the `focusout` handler closes the menu
 * the moment focus leaves the group. A trap here would strand keyboard users
 * in a navigation menu they only wanted to skim.
 *
 * ## Closing
 *
 * Escape (restoring focus to the trigger), outside pointerdown, focus leaving
 * the group, and — the fast path — a delegated click on any link inside the
 * panel, which closes *before* the route commits so the panel never lingers
 * over a pending navigation. `Header` additionally closes everything on
 * `pathname` change and on `popstate`; this component is the fast path, not
 * the only guard.
 */
export function MegaMenu({
  menuKey,
  openKey,
  onOpenChange,
  label,
  className,
  triggerClassName,
  panelClassName,
  children,
}: {
  menuKey: string;
  openKey: string | null;
  onOpenChange: (key: string | null) => void;
  label: string;
  /** Applied to the positioning root — the header uses it to make this
   *  trigger one bordered cell in the nav row. */
  className?: string;
  /** Applied to the trigger button: the cell's own padding/alignment plus the
   *  inverted fill the header uses for the open item, so a mega-menu trigger
   *  and a plain nav link are visually identical cells. */
  triggerClassName?: string;
  /** Extra classes for the panel plane (the header passes the floating bar's
   *  own inset so the panel hangs off the bar's bottom edge, flush with it). */
  panelClassName?: string;
  children: ReactNode;
}) {
  const isOpen = openKey === menuKey;
  const triggerRef = useRef<HTMLButtonElement>(null);
  const rootRef = useRef<HTMLDivElement>(null);
  const hoverTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const panelId = useId();

  const clearHoverTimer = useCallback(() => {
    if (hoverTimer.current !== null) {
      clearTimeout(hoverTimer.current);
      hoverTimer.current = null;
    }
  }, []);

  useEffect(() => clearHoverTimer, [clearHoverTimer]);

  useEffect(() => {
    if (!isOpen) return;

    function handleKeyDown(event: KeyboardEvent) {
      if (event.key !== "Escape") return;
      onOpenChange(null);
      triggerRef.current?.focus();
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

  // Hover-to-open, but only where hovering is a real, deliberate gesture: a
  // coarse pointer (touch) fires `pointerenter` on tap, which would open and
  // immediately re-close the panel under the user's finger. Guarded by both
  // the media query and `pointerType` so a stylus or a touch on a hybrid
  // laptop still falls through to the click path.
  function canHover() {
    return (
      typeof window !== "undefined" &&
      typeof window.matchMedia === "function" &&
      window.matchMedia("(hover: hover) and (pointer: fine)").matches
    );
  }

  return (
    <div
      ref={rootRef}
      className={cn("relative", className)}
      onPointerEnter={(event) => {
        if (event.pointerType !== "mouse" || !canHover()) return;
        clearHoverTimer();
        if (isOpen) return;
        hoverTimer.current = setTimeout(
          () => onOpenChange(menuKey),
          HOVER_OPEN_DELAY,
        );
      }}
      onPointerLeave={(event) => {
        if (event.pointerType !== "mouse" || !canHover()) return;
        clearHoverTimer();
        if (!isOpen) return;
        hoverTimer.current = setTimeout(
          () => onOpenChange(null),
          HOVER_CLOSE_DELAY,
        );
      }}
      // Close as soon as focus leaves the trigger+panel group (Tab past the
      // last link, or Shift+Tab back off the trigger). `relatedTarget` is the
      // element receiving focus; `null` means focus left the document
      // entirely, which we leave alone so the menu is still there when the
      // user returns to the tab.
      onBlur={(event) => {
        if (!isOpen) return;
        const next = event.relatedTarget as Node | null;
        if (next && rootRef.current?.contains(next)) return;
        if (next) onOpenChange(null);
      }}
    >
      <button
        ref={triggerRef}
        type="button"
        aria-expanded={isOpen}
        aria-controls={panelId}
        onClick={() => {
          clearHoverTimer();
          onOpenChange(isOpen ? null : menuKey);
        }}
        className={cn(
          "group type-nav relative flex items-center gap-(--space-3xs)",
          triggerClassName ?? "py-(--space-xs)",
        )}
      >
        <RollingLabel>{label}</RollingLabel>
        <svg
          aria-hidden="true"
          viewBox="0 0 16 16"
          className={cn(
            "h-3 w-3 transition-transform duration-(--duration-normal) ease-(--ease-nav)",
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

      {/* Page dim. Always mounted so it can fade with the panel; `opacity-0
          pointer-events-none` while closed means it never intercepts a click
          on the page underneath. Starts below the floating bar so the bar
          itself stays fully legible. */}
      <div
        aria-hidden="true"
        className={cn(
          "fixed inset-x-0 bottom-0 z-30 bg-black/20 transition-opacity ease-(--ease-nav)",
          isOpen
            ? "opacity-100 duration-(--duration-reveal)"
            : "pointer-events-none opacity-0 duration-(--duration-dismiss)",
        )}
        style={{ top: "var(--header-stack-height, 0px)" }}
      />

      <div
        id={panelId}
        role="region"
        aria-label={label}
        inert={!isOpen}
        aria-hidden={!isOpen}
        data-state={isOpen ? "open" : "closed"}
        // Fast path: close the instant a link inside the panel is activated,
        // rather than waiting for the route to commit. Delegated so it covers
        // every link the panel's children render without threading a callback
        // through them — including links whose href only differs by query
        // string, which would not change `pathname` and so would not trip the
        // route-change catch-all in `Header`.
        onClick={(event) => {
          if ((event.target as HTMLElement).closest("a[href]")) {
            onOpenChange(null);
          }
        }}
        style={{
          // Hang off the bar's bottom edge: the header stack's measured
          // height includes its own bottom gutter, so subtract it to land on
          // the bar's border rather than a gutter below it.
          top: "calc(var(--header-stack-height, 0px) - var(--space-2xs))",
        }}
        className={cn(
          "bg-surface border-border fixed z-40 border transition-[clip-path,opacity] ease-(--ease-nav)",
          isOpen
            ? "opacity-100 duration-(--duration-reveal) [clip-path:inset(0_0_0_0)]"
            : "opacity-0 duration-(--duration-dismiss) [clip-path:inset(0_0_100%_0)]",
          panelClassName,
        )}
      >
        {children}
      </div>
    </div>
  );
}
