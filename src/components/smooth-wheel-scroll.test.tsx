import { describe, expect, it, vi, beforeEach, afterEach } from "vitest";
import { render } from "@testing-library/react";
import { SmoothWheelScroll } from "@/components/smooth-wheel-scroll";

/**
 * The behaviour worth pinning here is not "does it animate" — it is *which
 * events it refuses to touch*. Every bug this component can cause is a
 * swallowed scroll: a trackpad that suddenly lags, a lightbox that scrolls the
 * page behind it, ⌘-wheel that stops zooming. So most of these assert
 * `defaultPrevented === false`.
 *
 * jsdom has no layout and no real rAF clock, so the environment is built by
 * hand: a scroll position that `scrollTo` actually moves, a frame queue the
 * test advances itself, and a `performance.now()` tied to the same clock.
 */

let clock = 0;
let frameQueue: FrameRequestCallback[] = [];
let scrollY = 0;

/** Runs one animation frame `ms` after the previous one. */
function advanceFrame(ms = 16) {
  clock += ms;
  const queued = frameQueue;
  frameQueue = [];
  for (const callback of queued) callback(clock);
}

function wheel(init: WheelEventInit) {
  const event = new WheelEvent("wheel", {
    bubbles: true,
    cancelable: true,
    ...init,
  });
  document.body.dispatchEvent(event);
  return event;
}

beforeEach(() => {
  clock = 0;
  frameQueue = [];
  scrollY = 0;

  Object.defineProperty(window, "scrollY", {
    get: () => scrollY,
    configurable: true,
  });
  Object.defineProperty(document.documentElement, "scrollHeight", {
    value: 5000,
    configurable: true,
  });
  window.scrollTo = ((options: ScrollToOptions) => {
    scrollY = options.top ?? scrollY;
  }) as typeof window.scrollTo;

  vi.spyOn(performance, "now").mockImplementation(() => clock);
  window.requestAnimationFrame = ((callback: FrameRequestCallback) =>
    frameQueue.push(callback)) as typeof window.requestAnimationFrame;
  window.cancelAnimationFrame = (() => {
    frameQueue = [];
  }) as typeof window.cancelAnimationFrame;
});

afterEach(() => {
  vi.restoreAllMocks();
  document.body.style.overflow = "";
});

describe("SmoothWheelScroll", () => {
  it("eases a wheel notch across several frames instead of jumping", () => {
    render(<SmoothWheelScroll />);

    const event = wheel({ deltaY: 100 });
    expect(event.defaultPrevented).toBe(true);

    // The whole point: after one frame the page has moved, but nowhere near
    // the full notch.
    advanceFrame();
    expect(scrollY).toBeGreaterThan(0);
    expect(scrollY).toBeLessThan(100);

    // And it does arrive — an easing that never settles would leave the page
    // permanently a few pixels short of where the wheel asked for.
    for (let i = 0; i < 60; i++) advanceFrame();
    expect(scrollY).toBe(100);
  });

  it("accumulates notches that arrive mid-animation", () => {
    render(<SmoothWheelScroll />);

    wheel({ deltaY: 100 });
    advanceFrame();
    wheel({ deltaY: 100 });
    for (let i = 0; i < 60; i++) advanceFrame();

    // Not 100: a second notch during the first one's flight has to push the
    // target further out, not restart it.
    expect(scrollY).toBe(200);
  });

  it("leaves a trackpad gesture entirely to the browser", () => {
    render(<SmoothWheelScroll />);

    // The ramp-up of a flick — too small to be a notch.
    expect(wheel({ deltaY: 6 }).defaultPrevented).toBe(false);
    // Its peak is notch-sized, but it is the same gesture and must stay the
    // browser's. This is the assertion that stops trackpads feeling laggy.
    expect(wheel({ deltaY: 120 }).defaultPrevented).toBe(false);
    expect(scrollY).toBe(0);
  });

  it("passes through zoom, horizontal and already-handled events", () => {
    render(<SmoothWheelScroll />);

    expect(wheel({ deltaY: 100, ctrlKey: true }).defaultPrevented).toBe(false);
    expect(wheel({ deltaY: 100, metaKey: true }).defaultPrevented).toBe(false);
    expect(wheel({ deltaY: 100, shiftKey: true }).defaultPrevented).toBe(false);
    expect(wheel({ deltaY: 20, deltaX: 100 }).defaultPrevented).toBe(false);
  });

  it("stands down while an overlay holds the body scroll-lock", () => {
    render(<SmoothWheelScroll />);
    document.body.style.overflow = "hidden";

    expect(wheel({ deltaY: 100 }).defaultPrevented).toBe(false);
  });

  it("lets a scrollable pane under the cursor keep its own scroll", () => {
    render(<SmoothWheelScroll />);

    const pane = document.createElement("div");
    pane.style.overflowY = "auto";
    Object.defineProperty(pane, "scrollHeight", { value: 800 });
    Object.defineProperty(pane, "clientHeight", { value: 200 });
    document.body.append(pane);

    const event = new WheelEvent("wheel", {
      deltaY: 100,
      bubbles: true,
      cancelable: true,
    });
    pane.dispatchEvent(event);

    expect(event.defaultPrevented).toBe(false);
    pane.remove();
  });

  it("does nothing at all under prefers-reduced-motion", () => {
    const matchMedia = window.matchMedia;
    window.matchMedia = ((query: string) => ({
      matches: query.includes("prefers-reduced-motion"),
      media: query,
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
      addListener: vi.fn(),
      removeListener: vi.fn(),
      dispatchEvent: vi.fn(),
      onchange: null,
    })) as unknown as typeof window.matchMedia;

    render(<SmoothWheelScroll />);
    expect(wheel({ deltaY: 100 }).defaultPrevented).toBe(false);

    window.matchMedia = matchMedia;
  });

  it("yields when something else moves the page mid-flight", () => {
    render(<SmoothWheelScroll />);

    wheel({ deltaY: 400 });
    advanceFrame();

    // An anchor link, the keyboard, or a `scrollIntoView` lands elsewhere.
    scrollY = 2000;
    advanceFrame();
    advanceFrame();

    expect(scrollY).toBe(2000);
    expect(frameQueue).toHaveLength(0);
  });
});
