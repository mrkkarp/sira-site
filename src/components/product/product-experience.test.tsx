import { describe, expect, it, vi, beforeEach } from "vitest";
import { render, screen, fireEvent, within } from "@testing-library/react";
import { getDictionary } from "@/i18n/get-dictionary";
import { ProductExperience } from "@/components/product/product-experience";
import { ToastProvider } from "@/components/ui/toast";
import { __resetCartStoreForTests } from "@/lib/cart-store";
import type { Product } from "@/lib/schemas/product";

const push = vi.fn();
vi.mock("next/navigation", () => ({
  useRouter: () => ({ push }),
  usePathname: () => "/uk/products/odri",
}));

// jsdom has no real IntersectionObserver — a no-op stub is enough since
// these tests don't scroll; `pastCta` simply stays false, which is exactly
// what "hasn't scrolled yet" should look like.
class FakeIntersectionObserver {
  observe() {}
  disconnect() {}
  unobserve() {}
}
vi.stubGlobal("IntersectionObserver", FakeIntersectionObserver);

function odriProduct(): Product {
  return {
    slug: "odri",
    sku: "Odri",
    name: "Odri",
    sourceCategory: "Раковини/Підлогові",
    shopCategory: "sinks",
    specEntries: [],
    base: {
      sku: "Odri",
      colorLabel: "Сірий базовий",
      price: 15150,
      photo: "/odri-base.jpg",
      description: "",
    },
    customColour: {
      sku: "Odri color",
      colorLabel: "Свій колір",
      price: 18200,
      photo: "/odri-custom.jpg",
      description: "",
    },
  };
}

describe("ProductExperience", () => {
  beforeEach(() => {
    vi.restoreAllMocks();
    __resetCartStoreForTests();
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue({
        ok: true,
        json: async () => ({
          ok: true,
          view: { lines: [], currency: "UAH", count: 0, subtotal: 0 },
        }),
      } as Response),
    );
    push.mockClear();
  });

  it("shows the base variant's price/photo by default, with a from-prefix since a custom colour exists", async () => {
    const dictionary = await getDictionary("uk");
    render(
      <ToastProvider>
        <ProductExperience
          product={odriProduct()}
          dictionary={dictionary}
          locale="uk"
          basePath="/uk/products/odri"
          initialSelection={{}}
          brokenImageLabel="broken"
        />
      </ToastProvider>,
    );
    expect(
      screen.getByText(dictionary.shop.productCard.fromPricePrefix),
    ).toBeInTheDocument();
    expect(screen.getByAltText("Odri")).toHaveAttribute(
      "src",
      expect.stringContaining("odri-base"),
    );
    expect(
      screen.getByRole("button", { name: dictionary.product.addToCartCta }),
    ).toBeInTheDocument();
  });

  it("switches price, gallery photo, SKU, and the CTA itself when the shopper picks the custom colour, and syncs the URL", async () => {
    const dictionary = await getDictionary("uk");
    render(
      <ToastProvider>
        <ProductExperience
          product={odriProduct()}
          dictionary={dictionary}
          locale="uk"
          basePath="/uk/products/odri"
          initialSelection={{}}
          brokenImageLabel="broken"
        />
      </ToastProvider>,
    );

    const swatches = screen.getAllByRole("option");
    fireEvent.click(swatches[1]);

    expect(push).toHaveBeenCalledWith("/uk/products/odri?colour=custom", {
      scroll: false,
    });
    // The "Отримати прорахунок" quote flow replaces add-to-cart for the
    // custom-colour selection — never both at once.
    expect(
      screen.getByRole("button", { name: dictionary.product.requestQuoteCta }),
    ).toBeInTheDocument();
    expect(
      screen.queryByRole("button", { name: dictionary.product.addToCartCta }),
    ).not.toBeInTheDocument();
    expect(
      screen.queryByText(dictionary.shop.productCard.fromPricePrefix),
    ).not.toBeInTheDocument();
    expect(screen.getByAltText("Odri")).toHaveAttribute(
      "src",
      expect.stringContaining("odri-custom"),
    );
  });

  it("restores the custom-colour selection from the initial (URL-derived) selection after a refresh", async () => {
    const dictionary = await getDictionary("uk");
    render(
      <ToastProvider>
        <ProductExperience
          product={odriProduct()}
          dictionary={dictionary}
          locale="uk"
          basePath="/uk/products/odri"
          initialSelection={{ colour: "custom" }}
          brokenImageLabel="broken"
        />
      </ToastProvider>,
    );
    expect(
      screen.getByRole("button", { name: dictionary.product.requestQuoteCta }),
    ).toBeInTheDocument();
    const selected = within(screen.getByRole("listbox")).getByRole("option", {
      selected: true,
    });
    expect(selected).toHaveAttribute("aria-label", "Свій колір");
  });

  it("renders a plain add-to-cart button with no quote form for a single-variant product", async () => {
    const dictionary = await getDictionary("uk");
    const single: Product = {
      slug: "solo",
      sku: "SOLO",
      name: "Solo",
      sourceCategory: "Раковини/Накладні",
      shopCategory: "sinks",
      specEntries: [],
      base: { sku: "SOLO", price: 9000, photo: "/solo.jpg", description: "" },
    };
    render(
      <ToastProvider>
        <ProductExperience
          product={single}
          dictionary={dictionary}
          locale="uk"
          basePath="/uk/products/solo"
          initialSelection={{}}
          brokenImageLabel="broken"
        />
      </ToastProvider>,
    );
    expect(screen.queryByRole("listbox")).not.toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: dictionary.product.addToCartCta }),
    ).toBeInTheDocument();
    expect(
      screen.queryByText(dictionary.shop.productCard.fromPricePrefix),
    ).not.toBeInTheDocument();
  });
});
