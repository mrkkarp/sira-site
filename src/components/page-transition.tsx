"use client";

import { useEffect, useRef } from "react";
import type { ReactNode } from "react";
import { usePathname } from "next/navigation";

/** Short enough to read as "the page changed", short enough that nobody waits
 *  for it. Starts at 0.35 rather than 0 so the new page is legible from its
 *  first frame — a fade from zero *feels* slower than no fade at all. */
const DURATION = 220;
const EASING = "cubic-bezier(0.2, 1, 0.2, 1)";

/**
 * Renders the page's `<main>` and fades its content in on route change.
 *
 * Three things it deliberately does not do:
 *
 *  - **It does not gate navigation.** The animation runs in an effect *after*
 *    the new route has committed, so it can never delay a `<Link>`, and there
 *    is no loader, no exit animation and nothing to wait for. If the fade were
 *    dropped tomorrow the site would behave identically, only plainer.
 *  - **It does not remount.** The obvious implementation — `key={pathname}` on
 *    a wrapper so a CSS animation replays — throws away and rebuilds the whole
 *    page's DOM on every navigation, and the usual alternative (toggle the
 *    animation off, force a reflow, toggle it back) is a synchronous layout on
 *    the one frame that can least afford it. Web Animations does neither: it
 *    re-runs on demand, off the main thread.
 *  - **It does not transform.** `opacity` creates a stacking context but *not*
 *    a containing block, so `position: fixed` descendants (the mobile sticky
 *    CTA, dialogs) stay anchored to the viewport. A `transform` here would
 *    visibly displace them for the duration.
 *
 * Reduced motion is checked explicitly: the global
 * `prefers-reduced-motion` rule in globals.css only reaches CSS animations,
 * not scripted ones.
 */
export function PageTransition({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  const mainRef = useRef<HTMLElement>(null);
  // The previous *value* rather than an "is first render" flag: under
  // StrictMode the effect is deliberately run twice on mount, and a flag would
  // read the second run as a navigation and fade the very first paint.
  const lastPath = useRef<string | null>(null);

  useEffect(() => {
    if (lastPath.current === pathname) return;
    const isInitial = lastPath.current === null;
    lastPath.current = pathname;
    if (isInitial) return;

    const node = mainRef.current;
    if (!node || typeof node.animate !== "function") return;
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;

    // `fill: none` so an interrupted animation snaps back to the stylesheet's
    // opacity: 1 — a fast second navigation can never strand the page dimmed.
    const animation = node.animate([{ opacity: 0.35 }, { opacity: 1 }], {
      duration: DURATION,
      easing: EASING,
      fill: "none",
    });
    return () => animation.cancel();
  }, [pathname]);

  return (
    <main ref={mainRef} id="main-content" className="flex-1">
      {children}
    </main>
  );
}
