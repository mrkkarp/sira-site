import { describe, expect, it, vi, beforeEach } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { LocaleSwitcher } from "@/components/locale-switcher";

let pathname = "/shop";
const push = vi.fn();

vi.mock("next/navigation", () => ({
  usePathname: () => pathname,
  useRouter: () => ({ push, prefetch: vi.fn(), replace: vi.fn() }),
}));

/** Point jsdom's `window.location` at a URL so the click handler can read it. */
function at(url: string) {
  window.history.replaceState({}, "", url);
}

/**
 * The bug this guards: the switcher built every href from `usePathname()`
 * alone. A visitor who narrowed the catalogue down to a handful of products
 * and then switched language lost the entire selection and landed on a bare
 * `/shop`; `/search?q=…` landed on an empty search page the same way.
 *
 * The fix reads `window.location.search` when the link is *clicked* rather
 * than when it is rendered — see the long comment in `locale-switcher.tsx`
 * for why `useSearchParams()` is not usable in the root layout. So the two
 * halves are tested separately: the href is deliberately query-less (it is
 * what gets prerendered, crawled and copied), and the navigation that the
 * click actually performs is the one that carries the query.
 *
 * `uk` is the default locale and is served *unprefixed*, so the assertions
 * below are asymmetric on purpose: `/shop` for uk, `/en/shop` for en.
 */
describe("LocaleSwitcher", () => {
  beforeEach(() => {
    push.mockClear();
    at("/");
  });

  it("carries the query string across to the clicked locale", () => {
    pathname = "/shop";
    at("/shop?price=2000-5000&mount=countertop");
    render(<LocaleSwitcher locale="uk" />);

    fireEvent.click(screen.getByRole("link", { name: "en" }));

    expect(push).toHaveBeenCalledWith(
      "/en/shop?price=2000-5000&mount=countertop",
    );
  });

  it("strips the current locale prefix before adding the new one", () => {
    pathname = "/en/shop";
    at("/en/shop?q=odri");
    render(<LocaleSwitcher locale="en" />);

    fireEvent.click(screen.getByRole("link", { name: "uk" }));

    expect(push).toHaveBeenCalledWith("/shop?q=odri");
  });

  it("lets the plain href do the work when there is no query at all", () => {
    pathname = "/products/odri";
    at("/products/odri");
    render(<LocaleSwitcher locale="uk" />);

    fireEvent.click(screen.getByRole("link", { name: "en" }));

    // Nothing to preserve, so nothing to intercept: the browser follows the
    // href, and no stray "?" is appended to it.
    expect(push).not.toHaveBeenCalled();
  });

  it("leaves ⌘/Ctrl-click alone so 'open in new tab' still works", () => {
    pathname = "/shop";
    at("/shop?mount=countertop");
    render(<LocaleSwitcher locale="uk" />);

    const en = screen.getByRole("link", { name: "en" });
    fireEvent.click(en, { metaKey: true });
    fireEvent.click(en, { ctrlKey: true });

    // A new tab is the browser's job; hijacking it with `router.push` would
    // navigate the *current* tab instead, which is the opposite of what was
    // asked for.
    expect(push).not.toHaveBeenCalled();
  });

  it("renders query-less hrefs, which is what gets prerendered and crawled", () => {
    pathname = "/shop";
    at("/shop?q=odri");
    render(<LocaleSwitcher locale="uk" />);

    expect(screen.getByRole("link", { name: "en" })).toHaveAttribute(
      "href",
      "/en/shop",
    );
    expect(screen.getByRole("link", { name: "uk" })).toHaveAttribute(
      "href",
      "/shop",
    );
  });

  it("marks the active locale for assistive tech", () => {
    pathname = "/";
    render(<LocaleSwitcher locale="pl" />);

    expect(screen.getByRole("link", { name: "pl" })).toHaveAttribute(
      "aria-current",
      "true",
    );
    expect(screen.getByRole("link", { name: "uk" })).not.toHaveAttribute(
      "aria-current",
    );
  });
});
