"use client";

import { useEffect, useLayoutEffect, useRef } from "react";
import type { ReactNode } from "react";
import { usePathname } from "next/navigation";

/** Short enough to read as "the page changed", short enough that nobody waits
 *  for it. Starts at 0.35 rather than 0 so the new page is legible from its
 *  first frame — a fade from zero *feels* slower than no fade at all. */
const DURATION = 220;
const EASING = "cubic-bezier(0.2, 1, 0.2, 1)";

/**
 * Renders the page's `<main>`, pins the new route to the top of the document
 * before it is painted, and fades its content in.
 *
 * ## The scroll reset, and why it is ours and not the router's
 *
 * Next scrolls a new page into view *after* it has rendered: it walks the new
 * segment's top-level elements, skipping fixed and sticky ones, until it finds
 * a scrollable one that is visible, and only then scrolls
 * (`03-api-reference/02-components/link.md:236`). That inspection needs layout,
 * so it necessarily happens after the browser has already laid the new page
 * out — and the browser clamps scroll to the document during that same layout.
 *
 * On a phone that is very visible, because the documents differ in height by
 * an order of magnitude. Measured on a throttled iPhone profile, tapping a
 * product from 6000px down the 10328px-tall home page:
 *
 * ```
 *   t=  0ms  y=6000  h=10328  footer off screen
 *   t=497ms  y=1742  h= 2406  footer ON SCREEN   ← route committed, clamped
 *   t=607ms  y=   0  h= 2931  footer off screen  ← Next's scroll reset lands
 * ```
 *
 * The loading fallback is ~2400px tall, the visitor was 6000px down, so the
 * browser put them at the bottom of the new document — which is the footer.
 * That is the owner's «на секунду з'являється футер поки вантажиться», and it
 * lasted ~110ms here and longer on a slower phone.
 *
 * It cannot be fixed by making the fallback taller. The clamp lands the
 * viewport on the *last* pixel of the document, so whatever is last — the
 * footer, always — is what gets shown. `min-h-screen` on the two `loading.tsx`
 * files (written for exactly this bug) only helps when the visitor was already
 * near the top.
 *
 * So the scroll happens here instead, in a layout effect: those run inside the
 * commit that changed `pathname` and before the browser paints it, so the
 * first frame of the new route is already at the top and there is no clamped
 * frame to see. Next's own reset then runs into a page that is already there
 * and does nothing. This only ever *matches* what the router was going to do
 * anyway — every page on this site begins at the top of `<main>`, so the
 * router's "is the new page visible?" test resolves to "no, scroll to top"
 * whenever the visitor had scrolled at all.
 *
 * Query-only navigations — the shop's filter chips and pagination, which pass
 * `scroll={false}` or change only `?page=` — never reach this, because
 * `usePathname()` does not change for them.
 *
 * ## Why back and forward are left completely alone
 *
 * A history move restores a page the router already has: same content, same
 * height, same scroll offset. Measured on the same profile, going back to the
 * home page changed *nothing* on the page — the document stayed 10328px, no
 * skeleton appeared, the scroll stayed at 3963px — and the only thing that
 * happened was this component dimming the whole page to 35% and back over
 * 220ms. That is the owner's «коли повертаєшся назад на будь яку сторінку то
 * вона мигає»: not a transition, just a blink, and entirely self-inflicted.
 *
 * `popstate` fires before the router commits, so the flag it sets is readable
 * by the time the effect for that navigation runs. Both behaviours are skipped
 * on it: no fade, and no scroll reset either — the browser's scroll
 * restoration is the whole point of going back.
 *
 * ## Three things it deliberately does not do
 *
 *  - **It does not gate navigation.** The animation runs *after* the new route
 *    has committed, so it can never delay a `<Link>`, and there is no loader,
 *    no exit animation and nothing to wait for. If the fade were dropped
 *    tomorrow the site would behave identically, only plainer.
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
 * not scripted ones. The scroll reset is not motion and is not conditioned on
 * it — it removes a jump rather than adding one.
 */
export function PageTransition({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  const mainRef = useRef<HTMLElement>(null);
  // The previous *value* rather than an "is first render" flag: under
  // StrictMode the effect is deliberately run twice on mount, and a flag would
  // read the second run as a navigation and fade the very first paint.
  const lastPath = useRef<string | null>(null);
  const cameFromHistory = useRef(false);
  const animateFrom = useRef<number | null>(null);

  useEffect(() => {
    const onPopState = () => {
      cameFromHistory.current = true;
    };
    window.addEventListener("popstate", onPopState);
    return () => window.removeEventListener("popstate", onPopState);
  }, []);

  useLayoutEffect(() => {
    if (lastPath.current === pathname) return;
    const isInitial = lastPath.current === null;
    lastPath.current = pathname;

    const isHistoryMove = cameFromHistory.current;
    cameFromHistory.current = false;
    if (isInitial || isHistoryMove) return;

    // Before paint — see the header comment. `instant` because this is not a
    // journey the visitor takes, it is where the new page starts; `scroll-
    // behavior: smooth` anywhere in the cascade would otherwise animate it.
    window.scrollTo({ top: 0, left: 0, behavior: "instant" });
    animateFrom.current = performance.now();
  }, [pathname]);

  useEffect(() => {
    if (animateFrom.current === null) return;
    animateFrom.current = null;

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
