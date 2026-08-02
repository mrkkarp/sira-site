import { describe, expect, it } from "vitest";
import { render, screen } from "@testing-library/react";
import { Pagination } from "@/components/ui/pagination";

/**
 * Prompt 5 §11/§15 — pagination must produce correct, SEO-friendly per-page
 * links (real `<a href>`s, not client-only buttons), disable the Prev/Next
 * ends correctly, mark the current page with `aria-current="page"`, and
 * render nothing when there is only one page (rather than a useless
 * single-page control).
 */
const labels = {
  label: "Сторінки каталогу",
  prevLabel: "Попередня сторінка",
  nextLabel: "Наступна сторінка",
};

describe("Pagination", () => {
  it("renders nothing when there is only one page", () => {
    const { container } = render(
      <Pagination
        currentPage={1}
        totalPages={1}
        getHref={(page) => `/shop?page=${page}`}
        {...labels}
      />,
    );
    expect(container).toBeEmptyDOMElement();
  });

  it("renders a real link per page, using the caller's getHref", () => {
    render(
      <Pagination
        currentPage={2}
        totalPages={3}
        getHref={(page) => `/shop?page=${page}`}
        {...labels}
      />,
    );
    expect(screen.getByRole("link", { name: "1" })).toHaveAttribute(
      "href",
      "/shop?page=1",
    );
    expect(screen.getByRole("link", { name: "2" })).toHaveAttribute(
      "href",
      "/shop?page=2",
    );
    expect(screen.getByRole("link", { name: "3" })).toHaveAttribute(
      "href",
      "/shop?page=3",
    );
  });

  it("marks the current page with aria-current", () => {
    render(
      <Pagination
        currentPage={2}
        totalPages={3}
        getHref={(page) => `/shop?page=${page}`}
        {...labels}
      />,
    );
    expect(screen.getByRole("link", { name: "2" })).toHaveAttribute(
      "aria-current",
      "page",
    );
    expect(screen.getByRole("link", { name: "1" })).not.toHaveAttribute(
      "aria-current",
    );
  });

  /**
   * The ends used to stay `<a href>`s with `aria-disabled` and
   * `pointer-events-none` — which blocks the mouse and nothing else. They
   * remained in the tab order and Enter still navigated, so "Prev" on page 1
   * announced itself as disabled and then reloaded page 1. Asserting on the
   * *link* role is the point: at an end there must be no link at all.
   */
  it("offers no focusable control at either end of the range", () => {
    const { rerender } = render(
      <Pagination
        currentPage={1}
        totalPages={3}
        getHref={(page) => `/shop?page=${page}`}
        {...labels}
      />,
    );
    expect(
      screen.queryByRole("link", { name: labels.prevLabel }),
    ).not.toBeInTheDocument();
    expect(
      screen.getByRole("link", { name: labels.nextLabel }),
    ).toHaveAttribute("href", "/shop?page=2");

    rerender(
      <Pagination
        currentPage={3}
        totalPages={3}
        getHref={(page) => `/shop?page=${page}`}
        {...labels}
      />,
    );
    expect(
      screen.queryByRole("link", { name: labels.nextLabel }),
    ).not.toBeInTheDocument();
    expect(
      screen.getByRole("link", { name: labels.prevLabel }),
    ).toHaveAttribute("href", "/shop?page=2");
  });

  /**
   * The ends were hardcoded "Prev"/"Next" in the markup, so every locale —
   * including the Ukrainian default — shipped English controls while
   * `shop.pagination.prevLabel`/`nextLabel` sat unused in all three
   * dictionaries.
   */
  it("takes every visible string from the caller, with no English fallback", () => {
    render(
      <Pagination
        currentPage={2}
        totalPages={3}
        getHref={(page) => `/shop?page=${page}`}
        {...labels}
      />,
    );
    expect(
      screen.getByRole("navigation", { name: labels.label }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("link", { name: labels.prevLabel }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("link", { name: labels.nextLabel }),
    ).toBeInTheDocument();
    expect(screen.queryByText("Prev")).not.toBeInTheDocument();
    expect(screen.queryByText("Next")).not.toBeInTheDocument();
  });
});
