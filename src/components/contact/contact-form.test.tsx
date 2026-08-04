import { describe, expect, it, vi, beforeEach } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { getDictionary } from "@/i18n/get-dictionary";
import { ContactForm } from "@/components/contact/contact-form";
import { resetConsentModeForTests } from "@/lib/analytics/consent-mode";

/** Only the app's named event — gtag consent commands are not this file's business. */
const contactEvents = () =>
  (window.dataLayer ?? []).filter(
    (entry): entry is Record<string, unknown> =>
      Object.prototype.toString.call(entry) === "[object Object]" &&
      (entry as { event?: string }).event === "contact_submit",
  );

/** Required fields render their label with a trailing " *", so match loosely. */
function field(label: string) {
  return screen.getByLabelText(label, { exact: false });
}

/**
 * A successful submission now finishes *after* the conversion event rather than
 * before it: Enhanced Conversions hashes the contact details with
 * `crypto.subtle.digest`, which is async, and the event is pushed once that
 * resolves. Waiting only for `fetch` — or for the success message — therefore
 * ends the test with a push still in flight, and it lands in the *next* test's
 * `dataLayer`, failing an assertion that has nothing to do with it.
 */
async function waitForConversion() {
  await waitFor(() => expect(contactEvents()).toHaveLength(1));
}

describe("ContactForm", () => {
  beforeEach(() => {
    vi.restoreAllMocks();
    delete window.dataLayer;
    resetConsentModeForTests();
  });

  async function setup() {
    const dictionary = await getDictionary("uk");
    render(<ContactForm dictionary={dictionary} />);
    return dictionary;
  }

  function fill(dictionary: Awaited<ReturnType<typeof getDictionary>>) {
    fireEvent.change(field(dictionary.leadFields.nameLabel), {
      target: { value: "Марко" },
    });
    fireEvent.change(field(dictionary.leadFields.phoneLabel), {
      target: { value: "+380671112233" },
    });
    fireEvent.change(field(dictionary.contactForm.messageLabel), {
      target: { value: "Цікавить раковина 80 см." },
    });
  }

  it("posts the filled fields to /api/contact and confirms success", async () => {
    const fetchMock = vi.fn().mockResolvedValue({ ok: true });
    vi.stubGlobal("fetch", fetchMock);

    const dictionary = await setup();
    fill(dictionary);
    fireEvent.click(
      screen.getByRole("button", { name: dictionary.contactForm.submitCta }),
    );

    await waitFor(() => expect(fetchMock).toHaveBeenCalledTimes(1));
    const [url, init] = fetchMock.mock.calls[0];
    expect(url).toBe("/api/contact");
    expect(JSON.parse((init as RequestInit).body as string)).toEqual({
      name: "Марко",
      phone: "+380671112233",
      email: "",
      message: "Цікавить раковина 80 см.",
      // The honeypot travels with every submission — a form that forgets it is
      // not visibly broken, it just quietly accepts bots.
      companyWebsite: "",
    });

    expect(
      await screen.findByText(dictionary.contactForm.successMessage),
    ).toBeInTheDocument();
    await waitForConversion();
  });

  it("clears the fields after a successful submission", async () => {
    // Otherwise the next visitor at a shared machine — or the same person
    // wondering whether it went through — sends the identical enquiry twice.
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue({ ok: true }));
    const dictionary = await setup();
    fill(dictionary);
    fireEvent.click(
      screen.getByRole("button", { name: dictionary.contactForm.submitCta }),
    );

    await screen.findByText(dictionary.contactForm.successMessage);
    expect(field(dictionary.leadFields.nameLabel)).toHaveValue("");
    expect(field(dictionary.contactForm.messageLabel)).toHaveValue("");
    await waitForConversion();
  });

  it("reports the conversion only after the server accepted the lead", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue({ ok: true }));
    const dictionary = await setup();
    fill(dictionary);
    fireEvent.click(
      screen.getByRole("button", { name: dictionary.contactForm.submitCta }),
    );

    await waitFor(() => expect(contactEvents()).toHaveLength(1));
    // `location` separates this from the same event raised anywhere else. The
    // monetary half of the payload is `leadMonetary()`'s job and is covered by
    // `events.test.ts` against a stubbed `NEXT_PUBLIC_LEAD_VALUE_UAH`; what
    // this file is responsible for is that the event fires here at all, and
    // only on acceptance.
    expect(contactEvents()[0]).toMatchObject({
      event: "contact_submit",
      location: "contact_page",
    });
  });

  it("carries the phone hash for a visitor who left the email blank", async () => {
    // Email is optional on this form and most people skip it, so in practice
    // this event's match key is the phone alone. One key is worth strictly
    // more than none — the alternative is sending nothing and losing the
    // match entirely. The digest is an independent vector; see
    // `user-data.test.ts`.
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue({ ok: true }));
    const dictionary = await setup();
    fill(dictionary);
    fireEvent.click(
      screen.getByRole("button", { name: dictionary.contactForm.submitCta }),
    );

    await waitForConversion();
    expect(contactEvents()[0].user_data).toEqual({
      sha256_phone_number:
        "6a115656b1d0ab9d381d2cfd9405bfc084fabebfc5ffb50a0e3f9435b9c913a6",
    });
    expect(JSON.stringify(window.dataLayer ?? [])).not.toContain(
      "380671112233",
    );
  });

  it("counts nothing when the server refused the lead", async () => {
    // Counting on submit instead of on acceptance folds every rejection and
    // offline attempt into the number the campaign bids against.
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue({ ok: false }));
    const dictionary = await setup();
    fill(dictionary);
    fireEvent.click(
      screen.getByRole("button", { name: dictionary.contactForm.submitCta }),
    );

    expect(
      await screen.findByText(dictionary.contactForm.errorMessage),
    ).toBeInTheDocument();
    expect(contactEvents()).toHaveLength(0);
  });

  it("counts nothing, posts nothing, and focuses the first invalid field", async () => {
    // The status line at the bottom only speaks for the network path, so
    // without the focus move a screen reader user presses submit and nothing
    // is announced at all (WCAG 3.3.1).
    const fetchMock = vi.fn();
    vi.stubGlobal("fetch", fetchMock);
    const dictionary = await setup();
    fireEvent.click(
      screen.getByRole("button", { name: dictionary.contactForm.submitCta }),
    );

    expect(
      await screen.findByText(dictionary.leadFields.requiredName),
    ).toBeInTheDocument();
    expect(field(dictionary.leadFields.nameLabel)).toHaveFocus();
    expect(fetchMock).not.toHaveBeenCalled();
    expect(contactEvents()).toHaveLength(0);
  });

  it("focuses the phone field when only the phone is wrong", async () => {
    // `fieldRefs` is keyed in render order, so "first invalid" means first on
    // screen — not merely the first issue Zod happened to report.
    const fetchMock = vi.fn();
    vi.stubGlobal("fetch", fetchMock);
    const dictionary = await setup();
    fireEvent.change(field(dictionary.leadFields.nameLabel), {
      target: { value: "Марко" },
    });
    fireEvent.change(field(dictionary.leadFields.phoneLabel), {
      target: { value: "12" },
    });
    fireEvent.change(field(dictionary.contactForm.messageLabel), {
      target: { value: "Привіт" },
    });
    fireEvent.click(
      screen.getByRole("button", { name: dictionary.contactForm.submitCta }),
    );

    expect(
      await screen.findByText(dictionary.leadFields.invalidPhone),
    ).toBeInTheDocument();
    expect(field(dictionary.leadFields.phoneLabel)).toHaveFocus();
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("marks the invalid field for assistive technology, not just visually", async () => {
    vi.stubGlobal("fetch", vi.fn());
    const dictionary = await setup();
    fireEvent.click(
      screen.getByRole("button", { name: dictionary.contactForm.submitCta }),
    );

    const name = await screen.findByLabelText(
      dictionary.leadFields.nameLabel,
      { exact: false },
    );
    expect(name).toHaveAttribute("aria-invalid", "true");
    expect(name.getAttribute("aria-describedby")).toContain("-error");
  });
});
