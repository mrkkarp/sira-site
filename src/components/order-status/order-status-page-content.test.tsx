import { describe, expect, it, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { getDictionary } from "@/i18n/get-dictionary";
import { OrderStatusPageContent } from "@/components/order-status/order-status-page-content";

/**
 * `/order-status` is where a customer who has already paid comes to check on
 * their money, so a dead-end form here is expensive in trust. Submitting it
 * blank used to hit a bare `if (!orderNumber.trim() || !phone.trim()) return;`
 * — no message, no focus move, no state change. The form is `noValidate`, so
 * the browser's own required-field bubble was suppressed too and nothing
 * replaced it: the page simply appeared broken.
 *
 * These cover the contract that replaced it, not the implementation: a
 * message per offending field, an `aria-live` summary, `aria-invalid` on the
 * control, focus on the first bad field, and no wasted round trip.
 */
describe("OrderStatusPageContent", () => {
  async function renderPage() {
    const dictionary = await getDictionary("uk");
    render(<OrderStatusPageContent locale="uk" dictionary={dictionary} />);
    return dictionary;
  }

  /** Substring match: `FormField` appends an `aria-hidden` " *" to required labels. */
  function labelled(label: string) {
    return screen.getByLabelText(label, { exact: false });
  }

  it("marks both fields and focuses the first one on a blank submit", async () => {
    const fetchMock = vi.fn();
    vi.stubGlobal("fetch", fetchMock);
    const dictionary = await renderPage();
    const copy = dictionary.orderStatus;

    fireEvent.click(screen.getByRole("button", { name: copy.submitCta }));

    expect(
      await screen.findByText(copy.requiredOrderNumber),
    ).toBeInTheDocument();
    expect(
      screen.getByText(dictionary.leadFields.requiredPhone),
    ).toBeInTheDocument();
    expect(screen.getByText(copy.invalidFormMessage)).toBeInTheDocument();

    const orderNumberInput = labelled(copy.orderNumberLabel);
    expect(orderNumberInput).toHaveAttribute("aria-invalid", "true");
    expect(labelled(copy.phoneLabel)).toHaveAttribute("aria-invalid", "true");
    // The reason the old early-return was a bug: a keyboard or screen-reader
    // user was left on the submit button with nothing announced.
    expect(orderNumberInput).toHaveFocus();

    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("marks only the empty field when the other one is filled", async () => {
    const fetchMock = vi.fn();
    vi.stubGlobal("fetch", fetchMock);
    const dictionary = await renderPage();
    const copy = dictionary.orderStatus;

    fireEvent.change(labelled(copy.orderNumberLabel), {
      target: { value: "ODL-1042" },
    });
    fireEvent.click(screen.getByRole("button", { name: copy.submitCta }));

    expect(
      await screen.findByText(dictionary.leadFields.requiredPhone),
    ).toBeInTheDocument();
    expect(screen.queryByText(copy.requiredOrderNumber)).toBeNull();
    // Focus must follow the *offending* field, not always the first one.
    expect(labelled(copy.phoneLabel)).toHaveFocus();
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("clears the field errors once both values are supplied", async () => {
    const fetchMock = vi.fn().mockResolvedValue({
      json: async () => ({ ok: false, error: "not_found" }),
    });
    vi.stubGlobal("fetch", fetchMock);
    const dictionary = await renderPage();
    const copy = dictionary.orderStatus;

    fireEvent.click(screen.getByRole("button", { name: copy.submitCta }));
    expect(
      await screen.findByText(copy.requiredOrderNumber),
    ).toBeInTheDocument();

    fireEvent.change(labelled(copy.orderNumberLabel), {
      target: { value: "ODL-1042" },
    });
    fireEvent.change(labelled(copy.phoneLabel), {
      target: { value: "+380671112233" },
    });
    fireEvent.click(screen.getByRole("button", { name: copy.submitCta }));

    // The validation state must not outlive the problem it described, or the
    // "not found" answer arrives underneath a stale "fill this in".
    expect(await screen.findByText(copy.notFoundMessage)).toBeInTheDocument();
    expect(screen.queryByText(copy.requiredOrderNumber)).toBeNull();
    expect(screen.queryByText(copy.invalidFormMessage)).toBeNull();
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });
});
