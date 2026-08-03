"use client";

import { useEffect, useRef, useState } from "react";
import { usePathname } from "next/navigation";

/**
 * Route-change acknowledgement: a hairline that sweeps left-to-right across
 * the very top of the viewport, then fades.
 *
 * Deliberately not a "real" progress bar — the App Router exposes no stable,
 * site-wide navigation-*start* event outside per-`<Link>` `useLinkStatus`, so
 * anything claiming to track progress would be lying. This fires *after* the
 * new path commits and is purely decorative: it gates nothing, delays no
 * navigation, and adds no listeners.
 *
 * The sweep is re-triggered by a `key` (a monotonic counter) rather than by
 * toggling a class, so two fast navigations each play their own sweep instead
 * of the second being swallowed by the first still running. `scaleX` from a
 * left origin is compositor-only, so it costs nothing on the main thread while
 * the new page is painting — the moment the effect is most likely to collide
 * with real work. Under `prefers-reduced-motion` the global rule collapses the
 * duration to ~0 and the element simply never appears.
 */
export function RouteProgress() {
  const pathname = usePathname();
  const [sweep, setSweep] = useState(0);
  const isFirstRender = useRef(true);

  useEffect(() => {
    if (isFirstRender.current) {
      isFirstRender.current = false;
      return;
    }
    setSweep((value) => value + 1);
  }, [pathname]);

  if (sweep === 0) return null;

  return (
    <div
      key={sweep}
      aria-hidden="true"
      className="bg-text pointer-events-none fixed inset-x-0 top-0 z-[60] h-px origin-left [animation:route-sweep_var(--duration-slow)_var(--ease-nav)_both]"
    />
  );
}
