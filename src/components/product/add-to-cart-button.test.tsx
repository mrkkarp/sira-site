import { describe, expect, it, vi, beforeEach } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { getDictionary } from "@/i18n/get-dictionary";
import { AddToCartButton } from "@/components/product/add-to-cart-button";
import { ToastProvider } from "@/components/ui/toast";
import { __resetCartStoreForTests, useCart } from "@/lib/cart-store";
import { resetConsentModeForTests } from "@/lib/analytics/consent-mode";
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

const addToCartEvents = () =>
  (window.dataLayer ?? []).filter(
    (entry): entry is Record<string, unknown> =>
      Object.prototype.toString.call(entry) === "[object Object]" &&
      (entry as { event?: string }).event === "add_to_cart",
  );

describe("AddToCartButton", () => {
  beforeEach(() => {
    vi.restoreAllMocks();
    __resetCartStoreForTests();
    delete window.dataLayer;
    resetConsentModeForTests();
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

  describe("measurement", () => {
    async function clickAdd() {
      const dictionary = await getDictionary("uk");
      render(
        <ToastProvider>
          <AddToCartButton
            product={product()}
            variant={variant}
            dictionary={dictionary}
          />
        </ToastProvider>,
      );
      fireEvent.click(
        screen.getByRole("button", { name: dictionary.product.addToCartCta }),
      );
      return dictionary;
    }

    it("reports the add with the real variant and its real price", async () => {
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
      await clickAdd();

      await waitFor(() => expect(addToCartEvents()).toHaveLength(1));
      expect(addToCartEvents()[0]).toMatchObject({
        value: 15150,
        currency: "UAH",
        items: [{ item_id: "Odri", price: 15150, quantity: 1 }],
      });
    });

    it("reports nothing when the cart refused the item", async () => {
      // `addItem()` never throws — the cart store captures network and HTTP
      // failures into its own error state instead. Measuring on the click
      // rather than on this boolean would count an `add_to_cart` for every
      // rate-limited or rejected attempt, and GA4 would show a cart
      // abandonment that never happened.
      vi.stubGlobal(
        "fetch",
        vi.fn().mockImplementation((_url: string, init?: RequestInit) =>
          Promise.resolve({
            ok: init?.method !== "POST",
            json: async () =>
              init?.method === "POST"
                ? { ok: false, error: "rate_limited" }
                : { ok: true, view: emptyView },
          } as Response),
        ),
      );
      const dictionary = await clickAdd();

      expect(
        await screen.findByText(dictionary.product.addToCartError),
      ).toBeInTheDocument();
      expect(addToCartEvents()).toHaveLength(0);
    });
  });
});
