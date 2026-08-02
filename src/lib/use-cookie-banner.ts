"use client";

import { useSyncExternalStore } from "react";
import { readConsent, subscribeConsent } from "@/lib/cookie-consent";

/**
 * True while the cookie banner is still on screen (i.e. the visitor hasn't
 * accepted or rejected yet).
 *
 * The banner is `fixed inset-x-0 bottom-0 z-[45]`, so it covers the full
 * width of the bottom of the viewport and sits above every sticky bottom
 * bar. Anything else pinned to the bottom must yield to it or it becomes
 * un-clickable — not visually obviously so, which is how the back-to-top
 * button silently stopped working for first-time visitors.
 *
 * Deliberately subscribes via `subscribeConsent` (custom event *and*
 * `storage`) rather than `storage` alone: `storage` only fires in *other*
 * tabs, so a storage-only subscription never re-renders the tab where the
 * visitor actually clicked "Accept" — the bars stayed hidden until reload.
 *
 * The server snapshot is `false` (banner assumed decided) so nothing renders
 * a bottom bar on the server that the client would immediately remove; the
 * bars are scroll-gated and hidden on first paint anyway.
 */
export function useCookieBannerUndecided(): boolean {
  return useSyncExternalStore(
    subscribeConsent,
    () => readConsent() === null,
    () => false,
  );
}
