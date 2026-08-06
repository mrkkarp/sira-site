import { describe, expect, it, vi, beforeEach } from "vitest";
import { render, screen, fireEvent, within } from "@testing-library/react";
import { getDictionary } from "@/i18n/get-dictionary";
import { ProductExperience } from "@/components/product/product-experience";
import { ToastProvider } from "@/components/ui/toast";
import { __resetCartStoreForTests } from "@/lib/cart-store";
import type { Product } from "@/lib/schemas/product";

vi.mock("next/navigation", () => ({
  useRouter: () => ({ push: vi.fn() }),
  usePathname: () => "/products/odri",
}));

/** The page is prerendered, so the variant selection is carried entirely by
 * the URL and read in the browser. These tests drive the real thing —
 * `history.pushState`/`replaceState` and `popstate`, which jsdom implements —
 * rather than a stubbed router. */
function setUrl(search: string) {
  window.history.replaceState(null, "", `/products/odri${search}`);
}

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
    setUrl("");
  });

  it("shows the base variant's price/photo by default, with a from-prefix since a custom colour exists", async () => {
    const dictionary = await getDictionary("uk");
    render(
      <ToastProvider>
        <ProductExperience
          product={odriProduct()}
          dictionary={dictionary}
          locale="uk"
          basePath="/products/odri"
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
          basePath="/products/odri"
          brokenImageLabel="broken"
        />
      </ToastProvider>,
    );

    const radios = screen.getAllByRole("radio");
    fireEvent.click(radios[1]);

    // Written straight to the history stack, not pushed through the router:
    // the page is prerendered and doesn't read the query string, so there is
    // no server render to ask for.
    expect(window.location.pathname + window.location.search).toBe(
      "/products/odri?colour=custom",
    );
    // The calm consultation CTA replaces add-to-cart for the custom colour —
    // never both at once, and never an auto-appearing quote form/popup.
    expect(
      screen.getByRole("button", { name: dictionary.product.contactColourCta }),
    ).toBeInTheDocument();
    expect(
      screen.queryByRole("button", { name: dictionary.product.addToCartCta }),
    ).not.toBeInTheDocument();
    // The lead form is NOT auto-shown — its submit button only appears after
    // the shopper explicitly opens the consultation CTA.
    expect(
      screen.queryByRole("button", {
        name: dictionary.product.requestQuoteCta,
      }),
    ).not.toBeInTheDocument();
    expect(
      screen.queryByText(dictionary.shop.productCard.fromPricePrefix),
    ).not.toBeInTheDocument();
    expect(screen.getByAltText("Odri")).toHaveAttribute(
      "src",
      expect.stringContaining("odri-custom"),
    );
  });

  it("reveals the quote form only after an explicit click on the consultation CTA (no popup)", async () => {
    const dictionary = await getDictionary("uk");
    setUrl("?colour=custom");
    render(
      <ToastProvider>
        <ProductExperience
          product={odriProduct()}
          dictionary={dictionary}
          locale="uk"
          basePath="/products/odri"
          brokenImageLabel="broken"
        />
      </ToastProvider>,
    );
    // No form yet.
    expect(
      screen.queryByRole("button", {
        name: dictionary.product.requestQuoteCta,
      }),
    ).not.toBeInTheDocument();

    fireEvent.click(
      screen.getByRole("button", { name: dictionary.product.contactColourCta }),
    );

    // Now the inline lead form (with its submit button) is present.
    //
    // `find*` rather than `get*` because the form is a `next/dynamic` import:
    // it is the only thing on the product page that pulls zod into the
    // browser, and it is behind two deliberate gates (a custom colour, then a
    // click), so it is fetched on demand instead of shipped to every visitor.
    // What is under test here is unchanged — the form appears only after an
    // explicit click, never on its own — but "appears" is now a tick later.
    expect(
      await screen.findByRole("button", {
        name: dictionary.product.requestQuoteCta,
      }),
    ).toBeInTheDocument();
  });

  it("restores the custom-colour selection from a shared ?colour= URL", async () => {
    const dictionary = await getDictionary("uk");
    setUrl("?colour=custom");
    render(
      <ToastProvider>
        <ProductExperience
          product={odriProduct()}
          dictionary={dictionary}
          locale="uk"
          basePath="/products/odri"
          brokenImageLabel="broken"
        />
      </ToastProvider>,
    );
    expect(
      screen.getByRole("button", { name: dictionary.product.contactColourCta }),
    ).toBeInTheDocument();
    const selected = within(screen.getByRole("radiogroup")).getByRole("radio", {
      checked: true,
    });
    expect(selected).toHaveAccessibleName(
      expect.stringContaining(dictionary.product.colourCustomOptionTitle),
    );
  });

  it("follows the Back button back to the base colour", async () => {
    const dictionary = await getDictionary("uk");
    render(
      <ToastProvider>
        <ProductExperience
          product={odriProduct()}
          dictionary={dictionary}
          locale="uk"
          basePath="/products/odri"
          brokenImageLabel="broken"
        />
      </ToastProvider>,
    );

    fireEvent.click(screen.getAllByRole("radio")[1]);
    expect(
      screen.getByRole("button", { name: dictionary.product.contactColourCta }),
    ).toBeInTheDocument();

    // Selecting pushes a history entry, so Back has somewhere to go. jsdom
    // doesn't run the history stack, so the popped state is staged directly —
    // what is under test is that the component listens to `popstate` at all,
    // and that it *drops* the colour rather than keeping the last one picked.
    setUrl("");
    fireEvent.popState(window);

    expect(
      screen.getByRole("button", { name: dictionary.product.addToCartCta }),
    ).toBeInTheDocument();
    expect(screen.getByAltText("Odri")).toHaveAttribute(
      "src",
      expect.stringContaining("odri-base"),
    );
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
          basePath="/products/solo"
          brokenImageLabel="broken"
        />
      </ToastProvider>,
    );
    expect(screen.queryByRole("radiogroup")).not.toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: dictionary.product.addToCartCta }),
    ).toBeInTheDocument();
    expect(
      screen.queryByText(dictionary.shop.productCard.fromPricePrefix),
    ).not.toBeInTheDocument();
  });
});
