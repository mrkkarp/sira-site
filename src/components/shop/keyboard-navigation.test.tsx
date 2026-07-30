import { describe, expect, it } from "vitest";
import { render, screen } from "@testing-library/react";
import { getDictionary } from "@/i18n/get-dictionary";
import { emptyFilterState } from "@/lib/shop-filters";
import { ActiveFilterChips } from "@/components/shop/active-filter-chips";
import {
  FilterFieldsets,
  type ShopFacets,
} from "@/components/shop/filter-fieldsets";
import { chipLabel } from "@/lib/shop-chip-labels";

const facets: ShopFacets = {
  mount: [
    { value: "freestanding", count: 2, disabled: false },
    { value: "countertop", count: 0, disabled: true },
    { value: "wall-mounted", count: 0, disabled: true },
  ],
  placement: [],
  colour: [
    { value: "base", count: 2, disabled: false },
    { value: "custom", count: 0, disabled: true },
  ],
  collections: [],
  priceBounds: { min: 1000, max: 5000 },
  widthBounds: { min: 30, max: 50 },
  heightBounds: { min: 80, max: 90 },
};

/**
 * Prompt 5 §15 — keyboard navigation: an active-filter chip's remove
 * control must be a real, natively-focusable element (not a click-only
 * `<div>`), and every facet control in the sidebar/drawer must be a real
 * form control reachable via Tab, not a custom widget that swallows
 * keyboard focus.
 */
describe("keyboard navigation", () => {
  it("renders each active-filter chip's remove control as a natively focusable link with an accessible name", async () => {
    const dictionary = await getDictionary("uk");
    const filters = { ...emptyFilterState(), mount: ["freestanding" as const] };
    render(
      <ActiveFilterChips
        basePath="/shop/sinks"
        dictionary={dictionary}
        filters={filters}
        chipLabel={(chip) =>
          chipLabel(
            chip,
            dictionary,
            {},
            { price: "грн", width: "см", height: "см" },
          )
        }
      />,
    );

    const chipLink = screen.getByRole("link", {
      name: new RegExp(dictionary.shop.activeFilters.removeLabel),
    });
    // A real <a href>, not a tabIndex=-1 or JS-only click target.
    expect(chipLink.tagName).toBe("A");
    expect(chipLink).toHaveAttribute("href");
    expect(chipLink.tabIndex).not.toBe(-1);

    chipLink.focus();
    expect(document.activeElement).toBe(chipLink);
  });

  it("renders every enabled facet option as a real, focusable checkbox input", async () => {
    const dictionary = await getDictionary("uk");
    render(
      <FilterFieldsets
        dictionary={dictionary}
        category="sinks"
        facets={facets}
        value={emptyFilterState()}
        onChange={() => {}}
      />,
    );

    const checkboxes = screen.getAllByRole("checkbox") as HTMLInputElement[];
    expect(checkboxes.length).toBeGreaterThan(0);
    for (const checkbox of checkboxes) {
      expect(checkbox.tabIndex).not.toBe(-1);
    }

    // A disabled (count=0) option is still visible (so the shopper can see
    // it exists), but must not be a real Tab stop.
    const disabledOption = screen.getByLabelText(
      /Настінні/i,
    ) as HTMLInputElement;
    expect(disabledOption.disabled).toBe(true);

    const enabledOption = screen.getByLabelText(
      /Вільностоячі/i,
    ) as HTMLInputElement;
    expect(enabledOption.disabled).toBe(false);
    enabledOption.focus();
    expect(document.activeElement).toBe(enabledOption);
  });
});
