import { describe, expect, it } from "vitest";
import { render, screen } from "@testing-library/react";
import { getDictionary } from "@/i18n/get-dictionary";
import { ShopEmptyState } from "@/components/shop/shop-empty-state";

/**
 * Prompt 5 §12/§15 — neither empty state may be a blank page: both must
 * explain what happened and offer a way forward (clear filters and/or
 * links to other real categories), never just an empty grid.
 */
describe("ShopEmptyState", () => {
  it("explains a genuinely empty category and links to other real categories", async () => {
    const dictionary = await getDictionary("uk");
    render(
      <ShopEmptyState
        variant="empty-category"
        locale="uk"
        dictionary={dictionary}
        category="wall-modules"
      />,
    );

    expect(
      screen.getByText(dictionary.shop.states.emptyCategoryHeading),
    ).toBeInTheDocument();
    expect(
      screen.getByText(dictionary.shop.states.emptyCategoryBody),
    ).toBeInTheDocument();

    // The current category ("wall-modules") must not appear among the
    // "nearby categories" suggestions offered as a way forward.
    const nearbyLinks = screen.getAllByRole("link");
    expect(nearbyLinks.length).toBeGreaterThan(0);
    for (const link of nearbyLinks) {
      expect(link).toHaveAttribute(
        "href",
        expect.not.stringContaining("/shop/wall-modules"),
      );
    }
  });

  it("offers a clear-filters CTA for no-results, only when a clear href is given", async () => {
    const dictionary = await getDictionary("uk");
    const { rerender } = render(
      <ShopEmptyState
        variant="no-results"
        locale="uk"
        dictionary={dictionary}
        category="sinks"
        clearFiltersHref="/shop/sinks"
      />,
    );

    expect(
      screen.getByText(dictionary.shop.states.noResultsHeading),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("link", {
        name: dictionary.shop.states.noResultsClearCta,
      }),
    ).toHaveAttribute("href", "/shop/sinks");

    rerender(
      <ShopEmptyState
        variant="no-results"
        locale="uk"
        dictionary={dictionary}
        category="sinks"
      />,
    );
    expect(
      screen.queryByRole("link", {
        name: dictionary.shop.states.noResultsClearCta,
      }),
    ).not.toBeInTheDocument();
  });

  it("no-results still points to other real categories so the visitor isn't stuck", async () => {
    const dictionary = await getDictionary("uk");
    render(
      <ShopEmptyState
        variant="no-results"
        locale="uk"
        dictionary={dictionary}
        category="sinks"
      />,
    );
    const nearbyLinks = screen.getAllByRole("link");
    expect(nearbyLinks.length).toBeGreaterThan(0);
    for (const link of nearbyLinks) {
      expect(link).toHaveAttribute(
        "href",
        expect.not.stringContaining("/shop/sinks"),
      );
    }
  });
});
