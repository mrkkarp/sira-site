"use client";

import { useEffect } from "react";

/**
 * How fast the viewport catches up to where the wheel has pushed the target.
 *
 * This is a time constant, not a per-frame fraction: each frame closes
 * `1 - e^(-dt/TAU)` of the remaining gap, so a 120Hz display and a 60Hz one
 * travel at the same speed instead of the fast screen arriving twice as
 * quickly. ~105ms puts it at 95% of the distance in roughly a third of a
 * second — near enough to what the browser's own wheel animation does that
 * nothing feels slowed down, far enough from zero that the notch stops being
 * a teleport.
 */
const TAU_MS = 105;

/**
 * The smallest single delta a notched wheel produces. Chrome reports ~100px
 * per notch, Firefox reports it in lines; a trackpad's ramp-up starts at a
 * few pixels and only briefly exceeds this at the peak of a hard flick.
 */
const MOUSE_STEP_MIN = 48;

/** Silence that ends a gesture, after which the input is re-classified. */
const GESTURE_IDLE_MS = 220;

/** Below this the remaining distance is not worth another frame. */
const SETTLE_PX = 0.5;

/** `deltaMode` is a unit, not a number of pixels — normalise before using it. */
function toPixels(event: WheelEvent): number {
  if (event.deltaMode === WheelEvent.DOM_DELTA_LINE) return event.deltaY * 16;
  if (event.deltaMode === WheelEvent.DOM_DELTA_PAGE) {
    return event.deltaY * window.innerHeight;
  }
  return event.deltaY;
}

/**
 * Whether something between the cursor and the page can still absorb this
 * scroll itself — the lightbox, the mobile menu's list, any pane with its own
 * overflow. If it can, the event is none of our business: the browser has to
 * scroll that element, not the document behind it.
 */
function nestedPaneOwns(event: WheelEvent, delta: number): boolean {
  for (const node of event.composedPath()) {
    if (node === document.body || node === document.documentElement) break;
    if (!(node instanceof HTMLElement)) continue;
    if (node.scrollHeight <= node.clientHeight) continue;
    const overflowY = getComputedStyle(node).overflowY;
    if (overflowY !== "auto" && overflowY !== "scroll") continue;
    const room =
      delta > 0
        ? node.scrollHeight - node.clientHeight - node.scrollTop
        : node.scrollTop;
    if (room > 1) return true;
  }
  return false;
}

/**
 * Mouse-wheel scrolling, eased.
 *
 * ## What this fixes
 *
 * A trackpad reports scrolling as a continuous stream of small deltas, so the
 * page moves with the fingers and already feels smooth. A notched mouse wheel
 * reports one large jump per click — ~100px arriving in a single event — and
 * the page teleports that far. On a site that is long, quiet vertical runs of
 * photography and hairlines, that lands as a stutter.
 *
 * So the wheel's jumps become motion: each notch moves a *target* position and
 * the viewport is eased toward it over the following frames. Distance per
 * notch is left exactly as the browser reported it, so nothing about how far
 * the page travels changes — only whether it gets there in one frame or ten.
 *
 * ## What it deliberately does not do
 *
 * It is not a smooth-scroll library and it does not take the page's scrolling
 * away from the browser. Only events a notched wheel could have produced are
 * intercepted:
 *
 * - **Trackpads are left completely alone.** A gesture is classified as
 *   trackpad the moment it produces a delta too small for a notch, and stays
 *   classified that way until the stream goes quiet — which catches the fast
 *   flick whose *peak* deltas are wheel-sized but whose ramp-up is not.
 *   Hijacking a trackpad is how "smooth scrolling" sites end up feeling laggy:
 *   that input was already 1:1 with the hand and any easing added to it is
 *   pure latency.
 * - **Touch never reaches here** (`pointer: coarse` bails out), so momentum
 *   scrolling on a phone stays the platform's.
 * - ⌘/Ctrl (browser zoom), Shift and horizontal intent, and anything a nested
 *   pane can still consume are passed straight through.
 * - At the very top or bottom of the page nothing is prevented, so the
 *   browser's own overscroll behaviour is intact.
 * - `prefers-reduced-motion` disables all of it.
 *
 * ## Why an exponential and not a fixed-duration tween
 *
 * Notches arrive faster than any animation finishes. A tween would have to be
 * restarted on every one, and would visibly re-accelerate each time; a decay
 * toward a moving target just absorbs them — spinning the wheel harder pushes
 * the target further ahead and the page runs faster, which is what the hand
 * expects.
 *
 * Renders nothing. Mounted once in the locale layout.
 */
export function SmoothWheelScroll() {
  useEffect(() => {
    const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)");
    const coarsePointer = window.matchMedia("(pointer: coarse)");

    let target = 0;
    let current = 0;
    let frame = 0;
    let lastFrameAt = 0;
    let lastWheelAt = 0;
    let trackpadGesture = false;

    function step(now: number) {
      // Clamped so a backgrounded tab returning to the foreground does not
      // integrate one enormous timestep and jump the page.
      const dt = Math.min(now - lastFrameAt, 64);
      lastFrameAt = now;

      // Something other than the wheel moved the page mid-flight: an anchor
      // link, the keyboard, a `scrollIntoView`, or an overlay taking the body
      // scroll-lock (in which case `scrollY` has stopped responding at all).
      // Whatever it was, its position wins — stop rather than fight it or spin.
      if (Math.abs(window.scrollY - current) > 2) {
        frame = 0;
        return;
      }

      current += (target - current) * (1 - Math.exp(-dt / TAU_MS));
      if (Math.abs(target - current) < SETTLE_PX) current = target;
      window.scrollTo({
        top: current,
        left: window.scrollX,
        behavior: "instant",
      });

      frame = current === target ? 0 : requestAnimationFrame(step);
    }

    function onWheel(event: WheelEvent) {
      if (reducedMotion.matches || coarsePointer.matches) return;
      if (event.defaultPrevented || event.ctrlKey || event.metaKey) return;
      // Shift+wheel is the horizontal gesture; `deltaX` winning means the same
      // thing by another route.
      if (event.shiftKey || Math.abs(event.deltaY) <= Math.abs(event.deltaX)) {
        return;
      }
      // The mobile menu locks the document by setting this inline. Reading the
      // inline style rather than the computed one keeps the hot path free of a
      // forced style resolution.
      if (document.body.style.overflow === "hidden") return;

      const delta = toPixels(event);
      if (delta === 0) return;

      if (event.timeStamp - lastWheelAt > GESTURE_IDLE_MS) {
        trackpadGesture = false;
      }
      lastWheelAt = event.timeStamp;
      if (
        event.deltaMode === WheelEvent.DOM_DELTA_PIXEL &&
        Math.abs(delta) < MOUSE_STEP_MIN
      ) {
        trackpadGesture = true;
      }
      if (trackpadGesture) {
        // Hand the rest of the gesture back mid-flight rather than easing half
        // of it and dropping the other half.
        if (frame) {
          cancelAnimationFrame(frame);
          frame = 0;
        }
        return;
      }

      if (nestedPaneOwns(event, delta)) return;

      const limit = Math.max(
        0,
        document.documentElement.scrollHeight - window.innerHeight,
      );
      if (limit <= 0) return;

      // Re-seed from where the page actually is whenever a gesture starts from
      // rest; while a gesture is in flight the target keeps accumulating.
      if (!frame) {
        current = window.scrollY;
        target = current;
      }

      const next = Math.min(limit, Math.max(0, target + delta));
      // Already parked against an end: leave the event alone so the browser
      // can do its own overscroll.
      if (next === target) return;

      event.preventDefault();
      target = next;
      if (!frame) {
        lastFrameAt = performance.now();
        frame = requestAnimationFrame(step);
      }
    }

    window.addEventListener("wheel", onWheel, { passive: false });
    return () => {
      window.removeEventListener("wheel", onWheel);
      if (frame) cancelAnimationFrame(frame);
    };
  }, []);

  return null;
}
