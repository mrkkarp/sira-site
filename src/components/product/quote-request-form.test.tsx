import { describe, expect, it, vi, beforeEach } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { getDictionary } from "@/i18n/get-dictionary";
import { QuoteRequestForm } from "@/components/product/quote-request-form";
import { resetConsentModeForTests } from "@/lib/analytics/consent-mode";
import type { Product, ProductVariant } from "@/lib/schemas/product";

/** The custom-colour variant — the one this form actually appears for, and the
 * dearer of the two, which is the whole point of measuring the selected one. */
const customColour: ProductVariant = {
  sku: "Odri color",
  colorLabel: "Свій колір",
  price: 23400,
  photo: "/odri-color.jpg",
  description: "",
  contactRequired: true,
};

const base: ProductVariant = {
  sku: "Odri",
  colorLabel: "Сірий базовий",
  price: 19600,
  photo: "/odri.jpg",
  description: "",
};

const product: Product = {
  slug: "odri",
  sku: "Odri",
  name: "Раковина Odri",
  sourceCategory: "Раковини/Підлогові",
  shopCategory: "sinks",
  specEntries: [],
  base,
  customColour,
};

/** Only the app's named events — gtag commands are `consent-mode`'s business. */
const quoteEvents = () =>
  (window.dataLayer ?? []).filter(
    (entry): entry is Record<string, unknown> =>
      Object.prototype.toString.call(entry) === "[object Object]" &&
      (entry as { event?: string }).event === "quote_request",
  );

/**
 * A successful submission now finishes *after* the conversion event rather than
 * before it: Enhanced Conversions hashes the phone number with
 * `crypto.subtle.digest`, which is async, and the event is pushed once that
 * resolves. Waiting only for `fetch` — or for the success message — therefore
 * ends the test with a push still in flight, and it lands in the *next* test's
 * `dataLayer`, failing an assertion that has nothing to do with it.
 */
async function waitForConversion() {
  await waitFor(() => expect(quoteEvents()).toHaveLength(1));
}

/**
 * Prompt 6 §6/§16 — custom/individual-order products show "Отримати
 * прорахунок" instead of a normal add-to-cart, and the selected variant's
 * real summary must travel with the submission (not be dropped/faked).
 */
describe("QuoteRequestForm", () => {
  beforeEach(() => {
    vi.restoreAllMocks();
    delete window.dataLayer;
    resetConsentModeForTests();
  });

  it("submits name/phone plus the real selected-variant context", async () => {
    const fetchMock = vi.fn().mockResolvedValue({ ok: true });
    vi.stubGlobal("fetch", fetchMock);

    const dictionary = await getDictionary("uk");
    render(
      <QuoteRequestForm
        dictionary={dictionary}
        context="Odri (Odri color), колір: Свій колір"
        product={product}
        variant={customColour}
      />,
    );

    fireEvent.change(
      screen.getByPlaceholderText(dictionary.leadFields.nameLabel),
      {
        target: { value: "Марко" },
      },
    );
    fireEvent.change(
      screen.getByPlaceholderText(dictionary.leadFields.phonePlaceholder),
      {
        target: { value: "+380671112233" },
      },
    );
    fireEvent.click(
      screen.getByRole("button", { name: dictionary.product.requestQuoteCta }),
    );

    await waitFor(() => expect(fetchMock).toHaveBeenCalledTimes(1));
    const [url, init] = fetchMock.mock.calls[0];
    expect(url).toBe("/api/quote");
    const body = JSON.parse((init as RequestInit).body as string);
    expect(body).toEqual({
      name: "Марко",
      phone: "+380671112233",
      message: "Odri (Odri color), колір: Свій колір",
      productId: "odri",
      variantId: "Odri color",
      companyWebsite: "",
    });

    expect(
      await screen.findByText(dictionary.product.requestQuoteSuccess),
    ).toBeInTheDocument();
    await waitForConversion();
  });

  it("carries the qualification answers without displacing the variant price", async () => {
    // `trackQuoteRequest` spreads the qualification into the same event that
    // carries `value` and `items`. Google Ads bids on that number, so an extra
    // key must not be able to knock it out.
    const fetchMock = vi.fn().mockResolvedValue({ ok: true });
    vi.stubGlobal("fetch", fetchMock);

    const dictionary = await getDictionary("uk");
    render(
      <QuoteRequestForm
        dictionary={dictionary}
        context="Odri (Odri color), колір: Свій колір"
        product={product}
        variant={customColour}
      />,
    );

    fireEvent.change(
      screen.getByPlaceholderText(dictionary.leadFields.nameLabel),
      { target: { value: "Марко" } },
    );
    fireEvent.change(
      screen.getByPlaceholderText(dictionary.leadFields.phonePlaceholder),
      { target: { value: "+380671112233" } },
    );
    fireEvent.change(
      screen.getByLabelText(dictionary.leadQualification.projectTypeLabel, {
        exact: false,
      }),
      { target: { value: "outdoor" } },
    );
    fireEvent.click(
      screen.getByRole("button", { name: dictionary.product.requestQuoteCta }),
    );

    await waitFor(() => expect(fetchMock).toHaveBeenCalledTimes(1));
    const body = JSON.parse(
      (fetchMock.mock.calls[0][1] as RequestInit).body as string,
    );
    expect(body.projectType).toBe("outdoor");
    expect(body).not.toHaveProperty("timeline");

    await waitFor(() => expect(quoteEvents()).toHaveLength(1));
    expect(quoteEvents()[0]).toMatchObject({
      projectType: "outdoor",
      value: 23400,
      currency: "UAH",
    });
  });

  it("shows a required-field error instead of submitting when name/phone are empty", async () => {
    const fetchMock = vi.fn();
    vi.stubGlobal("fetch", fetchMock);

    const dictionary = await getDictionary("uk");
    render(
      <QuoteRequestForm
        dictionary={dictionary}
        context="Odri"
        product={product}
        variant={customColour}
      />,
    );

    fireEvent.click(
      screen.getByRole("button", { name: dictionary.product.requestQuoteCta }),
    );

    expect(
      await screen.findByText(dictionary.leadFields.requiredName),
    ).toBeInTheDocument();
    expect(fetchMock).not.toHaveBeenCalled();
  });

  describe("measurement", () => {
    async function submit(variant: ProductVariant) {
      const dictionary = await getDictionary("uk");
      render(
        <QuoteRequestForm
          dictionary={dictionary}
          context="Odri"
          product={product}
          variant={variant}
        />,
      );
      fireEvent.change(
        screen.getByPlaceholderText(dictionary.leadFields.nameLabel),
        { target: { value: "Марко" } },
      );
      fireEvent.change(
        screen.getByPlaceholderText(dictionary.leadFields.phonePlaceholder),
        { target: { value: "+380671112233" } },
      );
      fireEvent.click(
        screen.getByRole("button", { name: dictionary.product.requestQuoteCta }),
      );
      return dictionary;
    }

    it("reports the price of the variant the visitor had selected", async () => {
      // Not the product's default. The visitor configured a custom colour;
      // measuring `base` would under-report the site's main goal by 3 800 UAH
      // on every such lead, and Google Ads bids on exactly that number.
      vi.stubGlobal("fetch", vi.fn().mockResolvedValue({ ok: true }));
      await submit(customColour);

      await waitFor(() => expect(quoteEvents()).toHaveLength(1));
      expect(quoteEvents()[0]).toMatchObject({
        event: "quote_request",
        value: 23400,
        currency: "UAH",
        items: [
          {
            item_id: "Odri color",
            item_name: "Раковина Odri",
            item_category: "sinks",
            item_variant: "Свій колір",
            price: 23400,
            quantity: 1,
          },
        ],
      });
    });

    it("carries the phone hash, and only the hash", async () => {
      // This form has no email field, so the number is the single match key
      // Enhanced Conversions gets from the site's main conversion — and a
      // phone is precisely what a customer signed into Google on their own
      // handset is matchable by. The expected digest is an independent vector
      // (see `user-data.test.ts`), not something this code produced.
      vi.stubGlobal("fetch", vi.fn().mockResolvedValue({ ok: true }));
      await submit(customColour);

      await waitForConversion();
      expect(quoteEvents()[0].user_data).toEqual({
        sha256_phone_number:
          "6a115656b1d0ab9d381d2cfd9405bfc084fabebfc5ffb50a0e3f9435b9c913a6",
      });
      expect(JSON.stringify(window.dataLayer ?? [])).not.toContain(
        "380671112233",
      );
    });

    it("counts nothing when the server refused the lead", async () => {
      // The submission failed; the enquiry does not exist. A conversion
      // counted here would be a lead nobody can follow up — and it is the
      // failure that is invisible, because the visitor sees the error and the
      // campaign does not.
      vi.stubGlobal("fetch", vi.fn().mockResolvedValue({ ok: false }));
      const dictionary = await submit(base);

      expect(
        await screen.findByText(dictionary.product.requestQuoteError),
      ).toBeInTheDocument();
      expect(quoteEvents()).toHaveLength(0);
    });

    it("counts nothing when the fields never validated", async () => {
      const fetchMock = vi.fn();
      vi.stubGlobal("fetch", fetchMock);
      const dictionary = await getDictionary("uk");
      render(
        <QuoteRequestForm
          dictionary={dictionary}
          context="Odri"
          product={product}
          variant={base}
        />,
      );
      fireEvent.click(
        screen.getByRole("button", { name: dictionary.product.requestQuoteCta }),
      );

      expect(
        await screen.findByText(dictionary.leadFields.requiredName),
      ).toBeInTheDocument();
      expect(quoteEvents()).toHaveLength(0);
    });
  });
});
