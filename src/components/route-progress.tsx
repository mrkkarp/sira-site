"use client";

import { useEffect, useRef, useState } from "react";
import { usePathname } from "next/navigation";

/**
 * Minimal route-change indicator: a thin bar that briefly fades in on
 * navigation. Deliberately not a "real" progress bar (App Router doesn't
 * expose a stable, site-wide navigation-start event outside per-`<Link>`
 * `useLinkStatus`) — this just gives a calm, non-aggressive acknowledgement
 * that the page changed, matching BRAND_VISUAL_GUIDE §8 (opacity-only
 * transitions, no bounce/parallax).
 */
export function RouteProgress() {
  const pathname = usePathname();
  const [visible, setVisible] = useState(false);
  const isFirstRender = useRef(true);

  useEffect(() => {
    if (isFirstRender.current) {
      isFirstRender.current = false;
      return;
    }
    setVisible(true);
    const timeout = setTimeout(() => setVisible(false), 320);
    return () => clearTimeout(timeout);
  }, [pathname]);

  return (
    <div
      aria-hidden="true"
      className={`bg-focus fixed inset-x-0 top-0 z-[60] h-0.5 transition-opacity duration-(--duration-normal) ${
        visible ? "opacity-100" : "opacity-0"
      }`}
    />
  );
}
