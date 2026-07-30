import { describe, expect, it, vi, beforeEach } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import type { Product } from "@/lib/schemas/product";
import { emptyFilterState, type FilterState } from "@/lib/shop-filters";
import { buildShopFacets } from "@/lib/shop-facets";
import { getDictionary } from "@/i18n/get-dictionary";
import { formatTemplate } from "@/lib/format-template";
import { MobileFilterButton } from "@/components/shop/mobile-filter-button";

const push = vi.fn();
vi.mock("next/navigation", () => ({
  useRouter: () => ({ push }),
}));

function product(overrides: Partial<Product>): Product {
  return {
    slug: "test",
    sku: "TEST",
    name: "Test",
    sourceCategory: "Раковини/Вільностоячі",
    shopCategory: "sinks",
    specEntries: [],
    base: { sku: "TEST", price: 1000, photo: "/a.jpg", description: "desc" },
    ...overrides,
  };
}

const products: Product[] = [
  product({ slug: "free-a", name: "Alpha", sinkType: "freestanding" }),
  product({ slug: "counter-a", name: "Beta", sinkType: "countertop" }),
];

/**
 * Prompt 5 §6/§15 — the mobile drawer must hold its own pending state
 * (never rebuild the product list per tap), apply only when the CTA is
 * pressed, support "Clear", and be a real focus-trapping, Escape-closing
 * dialog (via the shared `DialogPrimitive`/`Drawer`).
 */
describe("MobileFilterButton", () => {
  beforeEach(() => {
    push.mockClear();
  });

  async function setup(filters: FilterState = emptyFilterState()) {
    const dictionary = await getDictionary("uk");
    const facets = buildShopFacets(products, filters);
    render(
      <MobileFilterButton
        basePath="/shop/sinks"
        dictionary={dictionary}
        category="sinks"
        facets={facets}
        filters={filters}
        allProducts={products}
        collectionMembershipMap={{}}
      />,
    );
    return { dictionary };
  }

  it("shows the plain filters label with no active filters, and a count badge once some are active", async () => {
    const { dictionary } = await setup();
    expect(
      screen.getByRole("button", { name: dictionary.shop.filtersButton }),
    ).toBeInTheDocument();

    await setup({ ...emptyFilterState(), mount: ["freestanding"] });
    expect(
      screen.getByRole("button", {
        name: formatTemplate(dictionary.shop.filtersButtonWithCount, {
          count: 1,
        }),
      }),
    ).toBeInTheDocument();
  });

  it("opens a focus-trapping dialog on click, and does not navigate until Apply is pressed", async () => {
    const { dictionary } = await setup();
    fireEvent.click(
      screen.getByRole("button", { name: dictionary.shop.filtersButton }),
    );

    const dialog = screen.getByRole("dialog");
    expect(dialog).toBeInTheDocument();
    // First focusable element inside the panel takes focus on open.
    expect(document.activeElement).not.toBe(document.body);
    expect(dialog.contains(document.activeElement)).toBe(true);

    // Toggling a facet checkbox only updates local pending state — no
    // navigation should happen yet.
    fireEvent.click(screen.getByLabelText(/Вільностоячі/i));
    expect(push).not.toHaveBeenCalled();

    fireEvent.click(
      screen.getByRole("button", {
        name: formatTemplate(dictionary.shop.filters.applyCtaWithCount, {
          count: 1,
        }),
      }),
    );
    expect(push).toHaveBeenCalledTimes(1);
    expect(push.mock.calls[0][0]).toContain("mount=freestanding");
  });

  it("Escape closes the drawer", async () => {
    const { dictionary } = await setup();
    fireEvent.click(
      screen.getByRole("button", { name: dictionary.shop.filtersButton }),
    );
    expect(screen.getByRole("dialog")).toBeInTheDocument();

    fireEvent.keyDown(document, { key: "Escape" });
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
  });

  it("Clear resets the pending selection without navigating", async () => {
    const { dictionary } = await setup({
      ...emptyFilterState(),
      mount: ["freestanding"],
    });
    fireEvent.click(
      screen.getByRole("button", {
        name: formatTemplate(dictionary.shop.filtersButtonWithCount, {
          count: 1,
        }),
      }),
    );

    const freestandingCheckbox = screen.getByLabelText(
      /Вільностоячі/i,
    ) as HTMLInputElement;
    expect(freestandingCheckbox.checked).toBe(true);

    fireEvent.click(
      screen.getByRole("button", { name: dictionary.shop.filters.clearAll }),
    );
    expect(push).not.toHaveBeenCalled();
    expect(
      (screen.getByLabelText(/Вільностоячі/i) as HTMLInputElement).checked,
    ).toBe(false);
  });
});
