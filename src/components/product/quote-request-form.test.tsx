import { describe, expect, it, vi, beforeEach } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { getDictionary } from "@/i18n/get-dictionary";
import { QuoteRequestForm } from "@/components/product/quote-request-form";

/**
 * Prompt 6 §6/§16 — custom/individual-order products show "Отримати
 * прорахунок" instead of a normal add-to-cart, and the selected variant's
 * real summary must travel with the submission (not be dropped/faked).
 */
describe("QuoteRequestForm", () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  it("submits name/phone plus the real selected-variant context", async () => {
    const fetchMock = vi.fn().mockResolvedValue({ ok: true });
    vi.stubGlobal("fetch", fetchMock);

    const dictionary = await getDictionary("uk");
    render(
      <QuoteRequestForm
        dictionary={dictionary}
        context="Odri (Odri color), колір: Свій колір"
      />,
    );

    fireEvent.change(
      screen.getByPlaceholderText(dictionary.callback.nameLabel),
      {
        target: { value: "Марко" },
      },
    );
    fireEvent.change(
      screen.getByPlaceholderText(dictionary.callback.phonePlaceholder),
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
      productId: undefined,
      variantId: undefined,
      companyWebsite: "",
    });

    expect(
      await screen.findByText(dictionary.product.requestQuoteSuccess),
    ).toBeInTheDocument();
  });

  it("shows a required-field error instead of submitting when name/phone are empty", async () => {
    const fetchMock = vi.fn();
    vi.stubGlobal("fetch", fetchMock);

    const dictionary = await getDictionary("uk");
    render(<QuoteRequestForm dictionary={dictionary} context="Odri" />);

    fireEvent.click(
      screen.getByRole("button", { name: dictionary.product.requestQuoteCta }),
    );

    expect(
      await screen.findByText(dictionary.callback.requiredName),
    ).toBeInTheDocument();
    expect(fetchMock).not.toHaveBeenCalled();
  });
});
