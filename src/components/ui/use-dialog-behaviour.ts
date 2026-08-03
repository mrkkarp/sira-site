"use client";

import { useEffect } from "react";
import type { RefObject } from "react";
import { lockBodyScroll } from "@/lib/body-scroll-lock";

const FOCUSABLE_SELECTOR =
  'a[href], button:not([disabled]), input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])';

/**
 * The behaviour every `aria-modal` overlay on this site owes the visitor:
 * focus moves in, Tab cannot leave, Escape closes, the page behind neither
 * scrolls nor loses the visitor's place, and focus returns to whatever opened
 * it.
 *
 * This exists because three overlays (`DialogPrimitive`, `MobileMenu`,
 * `SearchDrawer`) had each grown their own copy, and the copies had drifted
 * into genuinely different bugs rather than merely repeating themselves:
 * `SearchDrawer` declared `aria-modal="true"` with no trap at all — a
 * screen-reader user is told the rest of the page is inert while Tab walks
 * straight out into it — and no scroll lock; `DialogPrimitive` had a trap but
 * no scroll lock; only `MobileMenu` had both.
 *
 * The focusable list is queried **on every Tab**, not captured when the
 * overlay opens. `DialogPrimitive` captured it once, which is correct only
 * while the panel's contents never change — and the busiest overlay here is
 * the search drawer, whose entire body is replaced as results arrive. A
 * snapshot taken at open time is a list of nodes that have since been
 * discarded, so Tab wraps to a detached element and focus is lost to
 * `<body>`. Re-querying costs one `querySelectorAll` per keypress.
 */
export function useDialogBehaviour({
  open,
  onClose,
  panelRef,
  initialFocusRef,
}: {
  open: boolean;
  onClose: () => void;
  /** The dialog panel. Focus is confined to what is inside it. */
  panelRef: RefObject<HTMLElement | null>;
  /**
   * Where focus should land on open. Defaults to the first focusable element
   * in the panel — right for a modal whose first control is its close button,
   * wrong for the search drawer, where the visitor means to start typing.
   */
  initialFocusRef?: RefObject<HTMLElement | null>;
}) {
  useEffect(() => {
    if (!open) return;

    const trigger = document.activeElement;
    const releaseBodyScroll = lockBodyScroll();

    const initial = initialFocusRef?.current;
    if (initial) {
      initial.focus();
    } else {
      panelRef.current
        ?.querySelectorAll<HTMLElement>(FOCUSABLE_SELECTOR)[0]
        ?.focus();
    }

    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") {
        onClose();
        return;
      }
      if (event.key !== "Tab") return;

      const focusable =
        panelRef.current?.querySelectorAll<HTMLElement>(FOCUSABLE_SELECTOR);
      if (!focusable || focusable.length === 0) return;

      const first = focusable[0];
      const last = focusable[focusable.length - 1];

      /**
       * Focus can sit outside the panel even with the trap in place — the
       * visitor may have clicked the backdrop, or the element they were on
       * was removed when the results re-rendered. Pull it back in rather than
       * letting Tab continue through the page behind.
       */
      if (
        document.activeElement instanceof Node &&
        !panelRef.current?.contains(document.activeElement)
      ) {
        event.preventDefault();
        (event.shiftKey ? last : first).focus();
        return;
      }

      if (event.shiftKey && document.activeElement === first) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault();
        first.focus();
      }
    }

    document.addEventListener("keydown", handleKeyDown);
    return () => {
      document.removeEventListener("keydown", handleKeyDown);
      releaseBodyScroll();
      if (trigger instanceof HTMLElement) trigger.focus();
    };
  }, [open, onClose, panelRef, initialFocusRef]);
}
