import { describe, expect, it, vi, beforeEach, afterEach } from "vitest";
import { act, render } from "@testing-library/react";
import { PageTransition } from "@/components/page-transition";

let pathname = "/";

vi.mock("next/navigation", () => ({
  usePathname: () => pathname,
}));

const scrollTo = vi.fn();
let keyframes: Keyframe[] | null = null;
let timing: KeyframeAnimationOptions | null = null;
const animate = vi.fn(
  (frames: Keyframe[], options: KeyframeAnimationOptions) => {
    keyframes = frames;
    timing = options;
    return { cancel: vi.fn() };
  },
);

beforeEach(() => {
  pathname = "/";
  scrollTo.mockClear();
  animate.mockClear();
  keyframes = null;
  timing = null;
  window.scrollTo = scrollTo as unknown as typeof window.scrollTo;
  // jsdom implements neither; both are the whole subject of this file.
  Element.prototype.animate = animate as unknown as Element["animate"];
  window.matchMedia = ((query: string) => ({
    matches: false,
    media: query,
    addEventListener: vi.fn(),
    removeEventListener: vi.fn(),
  })) as unknown as typeof window.matchMedia;
});

afterEach(() => {
  vi.restoreAllMocks();
});

/** Re-render with a new pathname, the way the router's context change would. */
function navigateTo(path: string, rerender: (ui: React.ReactElement) => void) {
  pathname = path;
  act(() => {
    rerender(
      <PageTransition>
        <p>{path}</p>
      </PageTransition>,
    );
  });
}

/** What the browser dispatches before the router commits a back/forward move. */
function pressBack(path: string, rerender: (ui: React.ReactElement) => void) {
  act(() => {
    window.dispatchEvent(new PopStateEvent("popstate"));
  });
  navigateTo(path, rerender);
}

/**
 * Both behaviours here exist because of one owner report, and both were
 * measured before they were written — per frame, on a throttled iPhone
 * profile, against production.
 *
 *   «на телефоні коли заходиш на сторінку на секунду зявляється футер поки
 *    вантажиться. а коли повертаєшся назад на будь яку сторінку то вона мигає»
 *
 * The footer half: a route change replaces a 10328px document with a ~2400px
 * loading skeleton. A visitor 6000px down gets clamped by the browser to the
 * bottom of the new document — which is the footer — and stays there for the
 * ~110ms until Next's own post-render scroll reset lands. Hence a scroll to
 * top inside the commit, before it can be painted.
 *
 * The blink half: going back changed nothing on the page — same document
 * height, no skeleton, scroll restored — and the only thing that happened was
 * this component dimming everything to 35% and back.
 *
 * So the rule these tests pin is the same one twice: **a history move is not a
 * page load.** Nothing is fetched, nothing is replaced, and both the fade and
 * the scroll reset would be destroying state the browser just restored. The
 * scroll assertion is the sharper of the two — restoring the reading position
 * is the entire purpose of pressing back, and a regression there is a data
 * loss, not a cosmetic one.
 */
describe("PageTransition", () => {
  it("leaves the first paint alone", () => {
    render(
      <PageTransition>
        <p>/</p>
      </PageTransition>,
    );

    expect(scrollTo).not.toHaveBeenCalled();
    expect(animate).not.toHaveBeenCalled();
  });

  it("pins a forward navigation to the top and fades it in", () => {
    const { rerender } = render(
      <PageTransition>
        <p>/</p>
      </PageTransition>,
    );

    navigateTo("/products/odri", rerender);

    expect(scrollTo).toHaveBeenCalledWith({
      top: 0,
      left: 0,
      behavior: "instant",
    });
    expect(animate).toHaveBeenCalledTimes(1);
    // Dimmed, not blanked: a fade from zero reads as slower than no fade.
    expect(keyframes).toEqual([{ opacity: 0.35 }, { opacity: 1 }]);
    // `fill: none` is the one non-negotiable option: an interrupted animation
    // has to snap back to the stylesheet's `opacity: 1`, so a fast second
    // navigation can never strand the page dimmed.
    expect(timing).toMatchObject({ fill: "none" });
  });

  it("does not touch scroll or opacity when the visitor goes back", () => {
    const { rerender } = render(
      <PageTransition>
        <p>/</p>
      </PageTransition>,
    );

    navigateTo("/products/odri", rerender);
    scrollTo.mockClear();
    animate.mockClear();

    pressBack("/", rerender);

    expect(scrollTo).not.toHaveBeenCalled();
    expect(animate).not.toHaveBeenCalled();
  });

  it("goes back to normal on the navigation after a back", () => {
    // The popstate flag is per-navigation. If it were left set, the first
    // forward tap after any back would silently lose its scroll reset — and
    // that is the tap most likely to be made from far down a long page.
    const { rerender } = render(
      <PageTransition>
        <p>/</p>
      </PageTransition>,
    );

    navigateTo("/products/odri", rerender);
    pressBack("/", rerender);
    scrollTo.mockClear();
    animate.mockClear();

    navigateTo("/products/monro", rerender);

    expect(scrollTo).toHaveBeenCalledTimes(1);
    expect(animate).toHaveBeenCalledTimes(1);
  });

  it("still resets scroll when the visitor asked for no motion", () => {
    // The fade is decoration and goes. The scroll reset is not motion — it
    // removes a jump rather than adding one — so it has to survive.
    window.matchMedia = ((query: string) => ({
      matches: true,
      media: query,
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
    })) as unknown as typeof window.matchMedia;

    const { rerender } = render(
      <PageTransition>
        <p>/</p>
      </PageTransition>,
    );

    navigateTo("/products/odri", rerender);

    expect(scrollTo).toHaveBeenCalledTimes(1);
    expect(animate).not.toHaveBeenCalled();
  });

  it("renders the landmark the skip link and the layout depend on", () => {
    const { container } = render(
      <PageTransition>
        <p>content</p>
      </PageTransition>,
    );

    const main = container.querySelector("main");
    expect(main?.id).toBe("main-content");
  });
});
