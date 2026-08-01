import { describe, expect, it, vi, beforeEach } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { getDictionary } from "@/i18n/get-dictionary";
import { CheckoutPageContent } from "@/components/checkout/checkout-page-content";
import type { CartLineItem } from "@/lib/cart-store";

/**
 * Phase F — `/checkout`, the single page where a bug costs a real order
 * rather than a lead. These cover the two failures that actually lost
 * orders, both of which are silent by nature (nothing throws, nothing is
 * logged, the customer just leaves):
 *
 *  1. The client schema used to let a blank city/branch through, so the
 *     server's `DeliveryMethodSchema` rejected it with a generic
 *     "Не вдалося оформити замовлення" and no field marked — a dead end.
 *     `CheckoutFields.superRefine` now mirrors the server's discriminated
 *     union per delivery type, so the failure is caught client-side and
 *     shown *on the offending field*, with focus moved there.
 *  2. `{ ok: true, orderNumber: "" }` is the deliberate fake-success shape
 *     the API returns for a honeypot-tripped submission. A real customer
 *     can trigger it if an extension autofills the hidden `companyWebsite`
 *     input; rendering "Замовлення прийнято" for an order that was never
 *     created is worse than an error, because they'd never follow up.
 *
 * The cart store is mocked rather than driven through `/api/cart`: the
 * component returns `null` while `isLoading`, and an empty-cart state with
 * no items, so without a populated cart the form under test never renders.
 * The mock returns `useCart()`'s real shape (see `src/lib/cart-store.tsx`).
 */

const cartLine: CartLineItem = {
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
};

/** Mutable so a single test can flip the cart into its loading state. */
const cartState = vi.hoisted(() => ({
  items: [] as CartLineItem[],
  subtotal: 0,
  isLoading: false,
}));

vi.mock("@/lib/cart-store", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@/lib/cart-store")>();
  return {
    ...actual,
    useCart: () => ({
      items: cartState.items,
      count: cartState.items.reduce((sum, line) => sum + line.quantity, 0),
      subtotal: cartState.subtotal,
      isLoading: cartState.isLoading,
      error: null,
      addItem: vi.fn(),
      removeItem: vi.fn(),
      setQuantity: vi.fn(),
      clear: vi.fn(),
    }),
  };
});

/** Substring match: `FormField` appends an `aria-hidden` " *" to required labels. */
function labelled(label: string) {
  return screen.getByLabelText(label, { exact: false });
}

describe("CheckoutPageContent", () => {
  beforeEach(() => {
    vi.restoreAllMocks();
    cartState.items = [cartLine];
    cartState.subtotal = 15150;
    cartState.isLoading = false;
  });

  async function renderCheckout() {
    const dictionary = await getDictionary("uk");
    render(<CheckoutPageContent locale="uk" dictionary={dictionary} />);
    return dictionary.checkout;
  }

  function fillCustomer() {
    fireEvent.change(labelled("Повне ім'я"), { target: { value: "Марко" } });
    fireEvent.change(labelled("Телефон"), {
      target: { value: "+380671112233" },
    });
  }

  it("blocks submit and marks the delivery fields when city and branch are blank", async () => {
    const fetchMock = vi.fn();
    vi.stubGlobal("fetch", fetchMock);
    const copy = await renderCheckout();

    // Contact details are valid — the *only* thing wrong is the delivery
    // pair that the default `novaPoshtaBranch` type requires. This is the
    // exact submission that used to reach the server and bounce.
    fillCustomer();
    fireEvent.click(screen.getByRole("button", { name: copy.submitCta }));

    expect(await screen.findByText(copy.requiredCity)).toBeInTheDocument();
    expect(screen.getByText(copy.requiredBranchNumber)).toBeInTheDocument();
    expect(screen.getByText(copy.invalidFormMessage)).toBeInTheDocument();

    const cityInput = labelled(copy.cityLabel);
    expect(cityInput).toHaveAttribute("aria-invalid", "true");
    expect(labelled(copy.branchNumberLabel)).toHaveAttribute(
      "aria-invalid",
      "true",
    );
    // Focus lands on the first invalid control, so a keyboard/screen-reader
    // user is taken to the field to fix rather than left at the button.
    expect(cityInput).toHaveFocus();

    // The whole point of the client-side refinement: no round trip at all.
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("marks every missing required field on a fully blank submit", async () => {
    const fetchMock = vi.fn();
    vi.stubGlobal("fetch", fetchMock);
    const copy = await renderCheckout();

    fireEvent.click(screen.getByRole("button", { name: copy.submitCta }));

    expect(await screen.findByText(copy.requiredFullName)).toBeInTheDocument();
    expect(screen.getByText(copy.requiredPhone)).toBeInTheDocument();
    expect(screen.getByText(copy.requiredCity)).toBeInTheDocument();
    expect(screen.getByText(copy.requiredBranchNumber)).toBeInTheDocument();
    expect(labelled(copy.fullNameLabel)).toHaveFocus();
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("requires only the pickup location when the delivery type is pickup", async () => {
    const fetchMock = vi.fn();
    vi.stubGlobal("fetch", fetchMock);
    const copy = await renderCheckout();

    // Guards the other half of the refinement: switching delivery type must
    // switch which fields are required, not just which inputs are rendered.
    // A refinement that always demanded a city would make pickup unorderable.
    fillCustomer();
    fireEvent.click(screen.getByLabelText(copy.deliveryPickup));
    fireEvent.click(screen.getByRole("button", { name: copy.submitCta }));

    expect(
      await screen.findByText(copy.requiredPickupLocation),
    ).toBeInTheDocument();
    expect(screen.queryByText(copy.requiredCity)).not.toBeInTheDocument();
    expect(fetchMock).not.toHaveBeenCalled();

    // …and once it's filled the same form submits, proving the pickup branch
    // isn't permanently blocked by the refinement.
    fireEvent.change(labelled(copy.pickupLocationLabel), {
      target: { value: "vdng-showroom" },
    });
    fetchMock.mockResolvedValue({
      ok: true,
      json: async () => ({
        ok: true,
        orderNumber: "ODL-2",
        status: "pending",
        provider: "manual",
      }),
    });
    fireEvent.click(screen.getByRole("button", { name: copy.submitCta }));

    await waitFor(() => expect(fetchMock).toHaveBeenCalledTimes(1));
    const body = JSON.parse(
      (fetchMock.mock.calls[0][1] as RequestInit).body as string,
    );
    expect(body.deliveryMethod).toEqual({
      type: "pickup",
      stockistId: "vdng-showroom",
    });
  });

  it("posts the order and confirms it with the returned order number", async () => {
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({
        ok: true,
        orderNumber: "ODL-1042",
        status: "pending",
        provider: "manual",
      }),
    });
    vi.stubGlobal("fetch", fetchMock);
    const copy = await renderCheckout();

    fillCustomer();
    fireEvent.change(labelled(copy.emailLabel), {
      target: { value: "marko@example.com" },
    });
    fireEvent.change(labelled(copy.cityLabel), { target: { value: "Київ" } });
    fireEvent.change(labelled(copy.branchNumberLabel), {
      target: { value: "12" },
    });
    fireEvent.change(labelled(copy.notesLabel), {
      target: { value: "Подзвоніть перед доставкою" },
    });
    fireEvent.click(screen.getByRole("button", { name: copy.submitCta }));

    await waitFor(() => expect(fetchMock).toHaveBeenCalledTimes(1));
    const [url, init] = fetchMock.mock.calls[0];
    expect(url).toBe("/api/checkout?locale=uk");
    const body = JSON.parse((init as RequestInit).body as string);
    expect(body).toEqual({
      customer: {
        fullName: "Марко",
        phone: "+380671112233",
        email: "marko@example.com",
      },
      // The delivery payload is rebuilt per type, so the server's
      // discriminated union gets exactly the branch it expects.
      deliveryMethod: {
        type: "novaPoshtaBranch",
        cityName: "Київ",
        branchNumber: "12",
      },
      notes: "Подзвоніть перед доставкою",
      companyWebsite: "",
    });

    expect(
      await screen.findByText(copy.manualConfirmationHeading),
    ).toBeInTheDocument();
    // The number is what the customer quotes when they phone about the order,
    // so it has to be on screen, not just in the response.
    expect(
      screen.getByText((content) => content.includes("ODL-1042")),
    ).toBeInTheDocument();
  });

  it("treats ok:true with an empty orderNumber as a failure, not a confirmation", async () => {
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      // Verbatim honeypot response shape from `/api/checkout` — deliberately
      // indistinguishable from success at the HTTP level, so only the missing
      // order number tells the client that nothing was created.
      json: async () => ({
        ok: true,
        orderNumber: "",
        status: "pending",
        provider: "manual",
      }),
    });
    vi.stubGlobal("fetch", fetchMock);
    const copy = await renderCheckout();

    fillCustomer();
    fireEvent.change(labelled(copy.cityLabel), { target: { value: "Київ" } });
    fireEvent.change(labelled(copy.branchNumberLabel), {
      target: { value: "12" },
    });
    fireEvent.click(screen.getByRole("button", { name: copy.submitCta }));

    expect(await screen.findByText(copy.errorMessage)).toBeInTheDocument();
    expect(
      screen.queryByText(copy.manualConfirmationHeading),
    ).not.toBeInTheDocument();
    // The form stays on screen so the customer can retry instead of walking
    // away believing the order was placed.
    expect(
      screen.getByRole("button", { name: copy.submitCta }),
    ).toBeInTheDocument();
  });

  it("shows the error message when the API rejects the order", async () => {
    const fetchMock = vi.fn().mockResolvedValue({
      ok: false,
      json: async () => ({ ok: false, error: "validation_failed" }),
    });
    vi.stubGlobal("fetch", fetchMock);
    const copy = await renderCheckout();

    fillCustomer();
    fireEvent.change(labelled(copy.cityLabel), { target: { value: "Київ" } });
    fireEvent.change(labelled(copy.branchNumberLabel), {
      target: { value: "12" },
    });
    fireEvent.click(screen.getByRole("button", { name: copy.submitCta }));

    expect(await screen.findByText(copy.errorMessage)).toBeInTheDocument();
    expect(
      screen.queryByText(copy.manualConfirmationHeading),
    ).not.toBeInTheDocument();
  });

  it("renders nothing while the cart is still loading", async () => {
    // Guards the `isLoading` early return: rendering the form (or the
    // empty-cart state) before the server cart arrives would flash
    // "Кошик порожній" at a customer who does have items.
    cartState.isLoading = true;
    const dictionary = await getDictionary("uk");
    const { container } = render(
      <CheckoutPageContent locale="uk" dictionary={dictionary} />,
    );
    expect(container).toBeEmptyDOMElement();
  });
});
