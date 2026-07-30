import { describe, expect, it, vi, beforeEach } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { getDictionary } from "@/i18n/get-dictionary";
import { AddToCartButton } from "@/components/product/add-to-cart-button";
import { ToastProvider } from "@/components/ui/toast";
import { __resetCartStoreForTests, useCart } from "@/lib/cart-store";
import type { Product, ProductVariant } from "@/lib/schemas/product";

const oneLineView = {
  lines: [
    {
      id: "line-1",
      productSlug: "odri",
      productName: "Odri",
      variantSku: "Odri",
      quantity: 1,
      unitPrice: 15150,
      currentPrice: 15150,
      priceChanged: false,
      orderable: true,
      currency: "UAH",
    },
  ],
  currency: "UAH",
  count: 1,
  subtotal: 15150,
};
const emptyView = { lines: [], currency: "UAH", count: 0, subtotal: 0 };

function product(overrides: Partial<Product> = {}): Product {
  return {
    slug: "odri",
    sku: "Odri",
    name: "Odri",
    sourceCategory: "Раковини/Підлогові",
    shopCategory: "sinks",
    specEntries: [],
    base: {
      sku: "Odri",
      price: 15150,
      photo: "/odri-base.jpg",
      description: "",
    },
    ...overrides,
  };
}

const variant: ProductVariant = {
  sku: "Odri",
  price: 15150,
  photo: "/odri-base.jpg",
  description: "",
};

function CartCount() {
  const { count } = useCart();
  return <span data-testid="cart-count">{count}</span>;
}

describe("AddToCartButton", () => {
  beforeEach(() => {
    vi.restoreAllMocks();
    __resetCartStoreForTests();
  });

  it("adds the real selected variant to the cart and announces success", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockImplementation((_url: string, init?: RequestInit) =>
        Promise.resolve({
          ok: true,
          json: async () => ({
            ok: true,
            view: init?.method === "POST" ? oneLineView : emptyView,
          }),
        } as Response),
      ),
    );
    const dictionary = await getDictionary("uk");
    render(
      <ToastProvider>
        <AddToCartButton
          product={product()}
          variant={variant}
          dictionary={dictionary}
        />
        <CartCount />
      </ToastProvider>,
    );

    fireEvent.click(
      screen.getByRole("button", { name: dictionary.product.addToCartCta }),
    );

    await waitFor(() =>
      expect(screen.getByTestId("cart-count")).toHaveTextContent("1"),
    );
    expect(
      await screen.findByText(
        (content) => content.includes("Odri") && content.includes("додано"),
      ),
    ).toBeInTheDocument();
  });

  it("does not add twice for a rapid double click", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockImplementation((_url: string, init?: RequestInit) =>
        Promise.resolve({
          ok: true,
          json: async () => ({
            ok: true,
            view: init?.method === "POST" ? oneLineView : emptyView,
          }),
        } as Response),
      ),
    );
    const dictionary = await getDictionary("uk");
    render(
      <ToastProvider>
        <AddToCartButton
          product={product()}
          variant={variant}
          dictionary={dictionary}
        />
        <CartCount />
      </ToastProvider>,
    );

    const button = screen.getByRole("button", {
      name: dictionary.product.addToCartCta,
    });
    fireEvent.click(button);
    fireEvent.click(button);

    await waitFor(() =>
      expect(screen.getByTestId("cart-count")).toHaveTextContent("1"),
    );
  });
});
