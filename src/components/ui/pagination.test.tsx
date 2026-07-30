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
describe("Pagination", () => {
  it("renders nothing when there is only one page", () => {
    const { container } = render(
      <Pagination
        currentPage={1}
        totalPages={1}
        getHref={(page) => `/shop?page=${page}`}
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

  it("disables Prev on the first page and Next on the last page", () => {
    const { rerender } = render(
      <Pagination
        currentPage={1}
        totalPages={3}
        getHref={(page) => `/shop?page=${page}`}
      />,
    );
    expect(screen.getByRole("link", { name: "Prev" })).toHaveAttribute(
      "aria-disabled",
      "true",
    );
    expect(screen.getByRole("link", { name: "Next" })).toHaveAttribute(
      "aria-disabled",
      "false",
    );

    rerender(
      <Pagination
        currentPage={3}
        totalPages={3}
        getHref={(page) => `/shop?page=${page}`}
      />,
    );
    expect(screen.getByRole("link", { name: "Next" })).toHaveAttribute(
      "aria-disabled",
      "true",
    );
    expect(screen.getByRole("link", { name: "Prev" })).toHaveAttribute(
      "aria-disabled",
      "false",
    );
  });

  it("uses a distinguishing aria-label so multiple paginations on a page stay distinct", () => {
    render(
      <Pagination
        currentPage={1}
        totalPages={2}
        getHref={(page) => `/shop?page=${page}`}
        label="Custom pagination label"
      />,
    );
    expect(
      screen.getByRole("navigation", { name: "Custom pagination label" }),
    ).toBeInTheDocument();
  });
});
