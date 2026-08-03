import { describe, expect, it, vi, beforeEach } from "vitest";
import { render, screen } from "@testing-library/react";
import { getDictionary } from "@/i18n/get-dictionary";
import { CartPageContent } from "@/components/cart/cart-page-content";
import type { CartLineItem } from "@/lib/cart-store";

/**
 * A cart is a list of near-identical rows, and that is exactly what makes it
 * hostile to a screen reader: controls are announced out of their visual
 * context, so a row's "−/+/×" carry no clue about which product they act on.
 * Every control here used to share one label across every line — the whole
 * page read as "Кількість −, Кількість, Кількість +, Видалити" repeated N
 * times, and the only way to pick the right Видалити was to count.
 *
 * The product name was also a bare `<span>`. Going back to check a spec or a
 * colour before ordering meant the browser's Back button, which is only one
 * press away if you came here directly.
 *
 * These tests use two lines deliberately: with one line, ambiguous labels are
 * indistinguishable from scoped ones.
 *
 * The cart store is mocked because the real one is a cache in front of
 * `/api/cart` (see `src/lib/cart-store.tsx`) — there is no network here, and
 * the component renders skeletons until `isLoading` clears.
 */

function line(overrides: Partial<CartLineItem> & { id: string }): CartLineItem {
  return {
    productSlug: "odri",
    productName: "Odri",
    variantSku: "Odri",
    quantity: 1,
    unitPrice: 15150,
    currentPrice: 15150,
    priceChanged: false,
    orderable: true,
    currency: "UAH",
    ...overrides,
  };
}

const cartState = vi.hoisted(() => ({
  items: [] as CartLineItem[],
  isLoading: false,
}));

vi.mock("@/lib/cart-store", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@/lib/cart-store")>();
  return {
    ...actual,
    useCart: () => ({
      items: cartState.items,
      count: cartState.items.reduce((sum, l) => sum + l.quantity, 0),
      subtotal: cartState.items.reduce(
        (sum, l) => sum + (l.currentPrice ?? l.unitPrice) * l.quantity,
        0,
      ),
      isLoading: cartState.isLoading,
      error: null,
      addItem: vi.fn(),
      removeItem: vi.fn(),
      setQuantity: vi.fn(),
      clear: vi.fn(),
    }),
  };
});

describe("CartPageContent", () => {
  beforeEach(() => {
    cartState.isLoading = false;
    cartState.items = [
      line({ id: "line-1", productSlug: "odri", productName: "Odri" }),
      line({
        id: "line-2",
        productSlug: "mira",
        productName: "Mira",
        variantSku: "Mira",
        quantity: 3,
      }),
    ];
  });

  async function renderCart() {
    const dictionary = await getDictionary("uk");
    render(<CartPageContent locale="uk" dictionary={dictionary} />);
    return dictionary;
  }

  it("links each line to its own product page", async () => {
    await renderCart();

    expect(screen.getByRole("link", { name: "Odri" })).toHaveAttribute(
      "href",
      "/products/odri",
    );
    expect(screen.getByRole("link", { name: "Mira" })).toHaveAttribute(
      "href",
      "/products/mira",
    );
  });

  it("names the product in every quantity and remove control", async () => {
    await renderCart();

    // Each of these resolves to exactly one element only because the label
    // carries the product name — `getByRole` throws on multiple matches, so
    // the shared-label regression fails here rather than passing silently.
    for (const name of ["Odri", "Mira"]) {
      expect(
        screen.getByRole("button", { name: `Зменшити кількість: ${name}` }),
      ).toBeInTheDocument();
      expect(
        screen.getByRole("button", { name: `Збільшити кількість: ${name}` }),
      ).toBeInTheDocument();
      expect(
        screen.getByRole("button", { name: `Видалити з кошика: ${name}` }),
      ).toBeInTheDocument();
      expect(
        screen.getByRole("status", { name: `Кількість: ${name}` }),
      ).toBeInTheDocument();
    }
  });

  it("shows the per-line quantity in its own labelled output", async () => {
    await renderCart();

    expect(
      screen.getByRole("status", { name: "Кількість: Mira" }),
    ).toHaveTextContent("3");
  });
});
