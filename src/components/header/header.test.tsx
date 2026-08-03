import { describe, expect, it, vi, beforeEach, afterEach } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { getDictionary } from "@/i18n/get-dictionary";
import { Header } from "@/components/header/header";

// Mutable pathname so a test can simulate a navigation (internal link, logo,
// or browser Back/Forward — all of which change `usePathname()`) by pointing
// this at a new route and re-rendering.
let mockPathname = "/";
vi.mock("next/navigation", () => ({
  usePathname: () => mockPathname,
  useRouter: () => ({ push: vi.fn(), prefetch: vi.fn(), replace: vi.fn() }),
}));

/**
 * Regression guard for the reported bug: a header overlay (desktop mega-menu
 * or mobile drawer) staying open after the user clicks through to a new page.
 * The fix is a single route-change catch-all in `Header` that closes every
 * overlay whenever `pathname` changes. These render the real `Header` and
 * assert the overlay is gone — and the body scroll-lock released — after the
 * route changes.
 */
describe("Header route-change overlay reset", () => {
  beforeEach(() => {
    mockPathname = "/";
  });

  afterEach(() => {
    document.body.style.overflow = "";
  });

  async function renderHeader() {
    const dictionary = await getDictionary("uk");
    const utils = render(<Header locale="uk" dictionary={dictionary} />);
    return { dictionary, ...utils };
  }

  it("closes the desktop mega-menu when the route changes", async () => {
    const { dictionary, rerender } = await renderHeader();

    // The catalog trigger lives inside a dynamically-imported MegaMenu.
    const trigger = await screen.findByRole("button", {
      name: dictionary.nav.shop,
    });
    expect(trigger).toHaveAttribute("aria-expanded", "false");

    // The panel stays mounted at all times (so its `Link`s keep their prefetch
    // and the open animation can replay without a remount) — while closed it
    // is `inert` + `aria-hidden`, which is exactly what role queries ignore.
    // So "not in the accessibility tree" is the assertion, not "unmounted".
    const sinks = new RegExp(dictionary.catalogNav.sinks);
    expect(screen.queryByRole("link", { name: sinks })).not.toBeInTheDocument();

    fireEvent.click(trigger);
    expect(trigger).toHaveAttribute("aria-expanded", "true");
    // A real catalog link is now exposed in the open panel.
    expect(screen.getByRole("link", { name: sinks })).toBeInTheDocument();

    // Simulate navigating to the clicked page.
    mockPathname = "/shop/sinks";
    rerender(<Header locale="uk" dictionary={dictionary} />);

    expect(trigger).toHaveAttribute("aria-expanded", "false");
    expect(screen.queryByRole("link", { name: sinks })).not.toBeInTheDocument();
  });

  it("closes the mega-menu on Back/Forward that only changes the query string", async () => {
    const { dictionary } = await renderHeader();

    const trigger = await screen.findByRole("button", {
      name: dictionary.nav.shop,
    });
    fireEvent.click(trigger);
    expect(trigger).toHaveAttribute("aria-expanded", "true");

    // `/shop/sinks` → `/shop/sinks?mount=countertop` and back: `pathname` is
    // identical either way, so the route-change effect never fires and only
    // the `popstate` listener can catch this.
    fireEvent.popState(window);

    expect(trigger).toHaveAttribute("aria-expanded", "false");
  });

  it("closes the mobile drawer and releases the body scroll-lock on route change", async () => {
    const { dictionary, rerender } = await renderHeader();

    fireEvent.click(
      screen.getByRole("button", { name: dictionary.mobileMenu.openLabel }),
    );

    // The drawer is a dynamically-imported (ssr:false) component.
    const closeButton = await screen.findByRole("button", {
      name: dictionary.mobileMenu.closeLabel,
    });
    expect(closeButton).toBeInTheDocument();
    expect(document.body.style.overflow).toBe("hidden");

    // Simulate a route change (e.g. tapping a category, or Back/Forward).
    mockPathname = "/shop/planters";
    rerender(<Header locale="uk" dictionary={dictionary} />);

    await waitFor(() => {
      expect(
        screen.queryByRole("button", {
          name: dictionary.mobileMenu.closeLabel,
        }),
      ).not.toBeInTheDocument();
    });
    // Body is scrollable again — nothing left locking it.
    expect(document.body.style.overflow).toBe("");
  });
});
