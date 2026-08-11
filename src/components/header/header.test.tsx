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
    mockPathname = "/rakovyny";
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

    // `/rakovyny` → `/rakovyny?tap-hole=none` and back: `pathname` is
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
    mockPathname = "/vazony";
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

/**
 * The categories moved out from under `/shop` to the top level
 * (`/shop/sinks` → `/rakovyny`), which quietly broke the header's rule of
 * "current for my own href and anything nested under it": `/rakovyny` is a
 * *sibling* of `/shop`, not a descendant, so Каталог went dark on the five
 * pages the live Google Ads campaign lands on. `alsoCurrentFor` in
 * `src/config/navigation.ts` is the fix, and this is what stops it being
 * deleted later as redundant-looking config.
 *
 * Asserting on `aria-current` rather than on a class name: it is the actual
 * contract (the plain nav links have always carried it, and the mega-menu
 * trigger now does too), it survives a restyle, and it is the part a screen
 * reader can hear.
 */
describe("Header current-section state", () => {
  afterEach(() => {
    mockPathname = "/";
  });

  // A category and a subcategory fail differently: the first needs the
  // exact-match arm of the check, the second the prefix arm.
  it.each(["/rakovyny", "/rakovyny/nakladni", "/vulychni-mebli"])(
    "marks the catalogue cell as current on %s",
    async (pathname) => {
      mockPathname = pathname;
      const dictionary = await getDictionary("uk");
      render(<Header locale="uk" dictionary={dictionary} />);

      expect(
        screen.getByRole("button", { name: dictionary.nav.shop }),
      ).toHaveAttribute("aria-current", "page");
    },
  );

  it("leaves the catalogue cell unmarked off the catalogue", async () => {
    // Guards the guard: an `alsoCurrentFor` that matched everything (an empty
    // string slipping into the list, say) would make the cases above pass
    // while the header lit up on every page.
    mockPathname = "/about";
    const dictionary = await getDictionary("uk");
    render(<Header locale="uk" dictionary={dictionary} />);

    expect(
      screen.getByRole("button", { name: dictionary.nav.shop }),
    ).not.toHaveAttribute("aria-current");
  });
});

/**
 * The information disclosure the owner asked for on 2026-08-11: Дизайнерам
 * left the bar, Контакти took its cell, and the pages a buyer actually looks
 * for — delivery, care, warranty, trade terms — moved into a dropdown to its
 * right rather than being left to the footer.
 */
describe("Header information menu", () => {
  afterEach(() => {
    mockPathname = "/";
  });

  it("puts Контакти in the bar and the designers' page inside the menu", async () => {
    const dictionary = await getDictionary("uk");
    render(<Header locale="uk" dictionary={dictionary} />);

    // Контакти is a top-level cell now — a plain link, not a disclosure.
    expect(
      screen.getByRole("link", { name: dictionary.nav.contact }),
    ).toHaveAttribute("href", "/contact");
    // …and Дизайнерам is not, which is the half of the swap that would
    // otherwise silently survive as a fifth cell.
    expect(
      screen.queryByRole("link", { name: dictionary.nav.designers }),
    ).not.toBeInTheDocument();

    const trigger = await screen.findByRole("button", {
      name: dictionary.nav.info,
    });
    const terms = new RegExp(dictionary.megaMenu.designers.terms);
    expect(screen.queryByRole("link", { name: terms })).not.toBeInTheDocument();

    fireEvent.click(trigger);
    // The designers' page is one hover from the bar, so removing it from
    // `primaryNav` did not orphan it.
    expect(screen.getByRole("link", { name: terms })).toHaveAttribute(
      "href",
      "/designers",
    );
    // And the three pages the owner named by hand are all in there.
    for (const label of [
      dictionary.footerLinks.paymentDelivery,
      dictionary.footerLinks.care,
      dictionary.footerNav.production,
    ]) {
      expect(
        screen.getByRole("link", { name: new RegExp(label) }),
      ).toBeInTheDocument();
    }
  });

  /**
   * The load-bearing one. The information cell has no page of its own, so it
   * is "current" for everything it lists — and `/about#materials` is one of
   * the things it lists, which would make it current on `/about` too. Two
   * cells lit at once is not a cosmetic bug: `aria-current="page"` is a claim
   * about *which* section you are in, and answering it twice is answering it
   * wrong. `infoMenuSectionPaths` subtracts every path `primaryNav` already
   * claims; this is what stops that filter being deleted as redundant config.
   */
  it("lights exactly one cell on a page both could claim", async () => {
    mockPathname = "/about";
    const dictionary = await getDictionary("uk");
    render(<Header locale="uk" dictionary={dictionary} />);

    expect(
      screen.getByRole("link", { name: dictionary.nav.about }),
    ).toHaveAttribute("aria-current", "page");
    expect(
      screen.getByRole("button", { name: dictionary.nav.info }),
    ).not.toHaveAttribute("aria-current");
  });

  it("marks the information cell as current on a page only it links", async () => {
    mockPathname = "/care";
    const dictionary = await getDictionary("uk");
    render(<Header locale="uk" dictionary={dictionary} />);

    expect(
      screen.getByRole("button", { name: dictionary.nav.info }),
    ).toHaveAttribute("aria-current", "page");
  });
});
