import { describe, expect, it, beforeEach } from "vitest";
import { render, screen, act, cleanup } from "@testing-library/react";
import { BackToTop } from "@/components/back-to-top";
import { writeConsent } from "@/lib/cookie-consent";

/**
 * The bug this guards: the cookie banner is `fixed inset-x-0 bottom-0
 * z-[45]` and spans the full bottom edge of the viewport, while this button
 * sat in the bottom-right corner at `z-40`. It rendered *under* the banner,
 * so every click hit the banner instead — a visible, focusable control that
 * silently did nothing for every first-time visitor. `MobileStickyCta`
 * already yielded the bottom edge the same way; this one was missed.
 */
function scrollTo(y: number) {
  Object.defineProperty(window, "scrollY", { value: y, configurable: true });
  act(() => {
    window.dispatchEvent(new Event("scroll"));
  });
}

describe("BackToTop", () => {
  beforeEach(() => {
    cleanup();
    window.localStorage.clear();
    Object.defineProperty(window, "scrollY", { value: 0, configurable: true });
  });

  it("stays hidden until the visitor has scrolled well past one viewport", () => {
    writeConsent({ analytics: false, marketing: false });
    render(<BackToTop label="Нагору" />);

    expect(screen.queryByRole("button", { name: "Нагору" })).toBeNull();
    scrollTo(window.innerHeight * 2);
    expect(screen.getByRole("button", { name: "Нагору" })).toBeInTheDocument();
  });

  it("stands down while the cookie banner is still undecided", () => {
    // No stored consent — the banner is on screen, covering this corner.
    render(<BackToTop label="Нагору" />);
    scrollTo(window.innerHeight * 2);

    expect(screen.queryByRole("button", { name: "Нагору" })).toBeNull();
  });

  it("comes back in the same tab as soon as consent is recorded", () => {
    render(<BackToTop label="Нагору" />);
    scrollTo(window.innerHeight * 2);
    expect(screen.queryByRole("button", { name: "Нагору" })).toBeNull();

    // `storage` only fires in *other* tabs, so a storage-only subscription
    // left the button missing until reload for the visitor who actually
    // clicked "Accept". `subscribeConsent` also listens to the same-tab
    // custom event that `writeConsent` dispatches.
    act(() => {
      writeConsent({ analytics: true, marketing: true });
    });

    expect(screen.getByRole("button", { name: "Нагору" })).toBeInTheDocument();
  });
});
