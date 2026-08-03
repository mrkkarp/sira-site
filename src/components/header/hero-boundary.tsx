"use client";

import { useLayoutEffect, useRef } from "react";

/**
 * Marks the bottom edge of a page's dark hero. Render this once, right at
 * the end of a hero `Section` (`tone="dark"`), on any page that wants the
 * header to render transparent + light-text while the hero is in view and
 * solid once scrolled past. Pages that don't render this always get the solid
 * header.
 *
 * Also flags `<body data-has-hero>` so `globals.css` can zero out the page's
 * top padding for that route — the hero is expected to reserve its own
 * clearance under the header (see `--header-stack-height`).
 *
 * ## Why this publishes itself instead of letting the header find it
 *
 * The header used to locate this element with `getElementById` whenever the
 * pathname changed. That is a race it cannot win, because the pathname commits
 * before the new route's content has streamed in, and the *outgoing* route's
 * sentinel is often still mounted at that instant:
 *
 *  - Navigating **to** the homepage, the lookup ran before this component
 *    existed, found nothing, and — having nothing to observe — never created
 *    an IntersectionObserver at all. The hero then mounted with no watcher, so
 *    the bar stayed opaque over the photograph *permanently*.
 *  - Navigating **away** from it, the lookup found the old hero's sentinel and
 *    kept the inverted (light) ink over the incoming light page, leaving the
 *    navigation nearly invisible until the observer happened to catch up.
 *
 * Mount and unmount are the events the header actually cares about, and React
 * already orders them correctly — cleanups for the outgoing tree run before
 * setup for the incoming one, so a hero→hero navigation can't clobber itself
 * either. Publishing from here turns a timing guess into a subscription.
 *
 * A layout effect, so the header is corrected in the same frame the hero is
 * painted rather than one frame later.
 */

let currentBoundary: HTMLElement | null = null;
const listeners = new Set<() => void>();

function emit() {
  for (const listener of listeners) listener();
}

/** Subscribe to hero-sentinel mount/unmount. For `useSyncExternalStore`. */
export function subscribeHeroBoundary(listener: () => void) {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

/** The mounted hero sentinel, or `null` when the route has no hero. */
export function getHeroBoundary() {
  return currentBoundary;
}

/** Server snapshot: no DOM, so no hero — matches the header's initial render. */
export function getHeroBoundaryServerSnapshot(): HTMLElement | null {
  return null;
}

export function HeroBoundary() {
  const ref = useRef<HTMLDivElement>(null);

  useLayoutEffect(() => {
    const node = ref.current;
    currentBoundary = node;
    document.body.dataset.hasHero = "true";
    emit();

    return () => {
      // Identity-guarded: if a new hero has already registered itself (React
      // runs this cleanup before the incoming tree's setup, but be explicit),
      // this stale unmount must not null out its registration.
      if (currentBoundary === node) {
        currentBoundary = null;
        delete document.body.dataset.hasHero;
        emit();
      }
    };
  }, []);

  return (
    <div
      ref={ref}
      id="hero-boundary"
      aria-hidden="true"
      className="h-px w-full"
    />
  );
}
