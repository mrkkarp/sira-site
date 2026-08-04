import { describe, expect, it, vi, beforeEach } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { getDictionary } from "@/i18n/get-dictionary";
import { DesignerInquiryForm } from "@/components/designers/designer-inquiry-form";
import { resetConsentModeForTests } from "@/lib/analytics/consent-mode";

const designerEvents = () =>
  (window.dataLayer ?? []).filter(
    (entry): entry is Record<string, unknown> =>
      Object.prototype.toString.call(entry) === "[object Object]" &&
      (entry as { event?: string }).event === "designer_inquiry",
  );

/** Required fields render their label with a trailing " *", so match loosely. */
function field(label: string) {
  return screen.getByLabelText(label, { exact: false });
}

/**
 * A successful submission now finishes *after* the conversion event, not
 * before: Enhanced Conversions hashes the contact details with
 * `crypto.subtle.digest`, which is async, and the event is pushed once that
 * resolves. Any test that submits successfully has to wait for that, or its
 * still-pending push lands in the next test's `dataLayer` and fails an
 * unrelated assertion — which is exactly how this was first noticed.
 */
async function waitForConversion() {
  await waitFor(() => expect(designerEvents()).toHaveLength(1));
}

describe("DesignerInquiryForm", () => {
  beforeEach(() => {
    vi.restoreAllMocks();
    delete window.dataLayer;
    resetConsentModeForTests();
  });

  async function setup() {
    const dictionary = await getDictionary("uk");
    render(<DesignerInquiryForm dictionary={dictionary} />);
    return dictionary;
  }

  function fillRequired(
    dictionary: Awaited<ReturnType<typeof getDictionary>>,
    email = "olena@studio.example",
  ) {
    fireEvent.change(field(dictionary.leadFields.nameLabel), {
      target: { value: "Олена" },
    });
    fireEvent.change(field(dictionary.leadFields.phoneLabel), {
      target: { value: "+380671112233" },
    });
    fireEvent.change(field(dictionary.designersPage.emailLabel), {
      target: { value: email },
    });
  }

  it("posts the trade fields to /api/designer and confirms success", async () => {
    const fetchMock = vi.fn().mockResolvedValue({ ok: true });
    vi.stubGlobal("fetch", fetchMock);

    const dictionary = await setup();
    fillRequired(dictionary);
    fireEvent.change(field(dictionary.designersPage.companyLabel), {
      target: { value: "Studio Bureau" },
    });
    fireEvent.change(field(dictionary.designersPage.portfolioLabel), {
      target: { value: "behance.net/olena" },
    });
    fireEvent.change(field(dictionary.designersPage.messageLabel), {
      target: { value: "Готель на 40 номерів." },
    });
    fireEvent.click(
      screen.getByRole("button", { name: dictionary.designersPage.submitCta }),
    );

    await waitFor(() => expect(fetchMock).toHaveBeenCalledTimes(1));
    const [url, init] = fetchMock.mock.calls[0];
    expect(url).toBe("/api/designer");
    expect(JSON.parse((init as RequestInit).body as string)).toEqual({
      name: "Олена",
      phone: "+380671112233",
      email: "olena@studio.example",
      companyName: "Studio Bureau",
      portfolioUrl: "behance.net/olena",
      message: "Готель на 40 номерів.",
      companyWebsite: "",
    });

    expect(
      await screen.findByText(dictionary.designersPage.successMessage),
    ).toBeInTheDocument();
    await waitForConversion();
  });

  it("refuses to submit without an email, unlike the other forms", async () => {
    // The one form on the site where email is required, on purpose: a trade
    // conversation is drawings, specifications and a quotation, and a phone
    // number cannot receive an attachment.
    const fetchMock = vi.fn();
    vi.stubGlobal("fetch", fetchMock);
    const dictionary = await setup();
    fireEvent.change(field(dictionary.leadFields.nameLabel), {
      target: { value: "Олена" },
    });
    fireEvent.change(field(dictionary.leadFields.phoneLabel), {
      target: { value: "+380671112233" },
    });
    fireEvent.click(
      screen.getByRole("button", { name: dictionary.designersPage.submitCta }),
    );

    expect(
      await screen.findByText(dictionary.designersPage.requiredEmail),
    ).toBeInTheDocument();
    expect(field(dictionary.designersPage.emailLabel)).toHaveFocus();
    expect(fetchMock).not.toHaveBeenCalled();
    expect(designerEvents()).toHaveLength(0);
  });

  it("distinguishes a missing email from a malformed one", async () => {
    vi.stubGlobal("fetch", vi.fn());
    const dictionary = await setup();
    fillRequired(dictionary, "olena@");
    fireEvent.click(
      screen.getByRole("button", { name: dictionary.designersPage.submitCta }),
    );

    expect(
      await screen.findByText(dictionary.leadFields.invalidEmail),
    ).toBeInTheDocument();
  });

  it("accepts a portfolio link typed without a scheme", async () => {
    // Not `type="url"` and not `.url()`: `behance.net/olena` is how a designer
    // actually writes it, and the server takes it as free text for that reason.
    const fetchMock = vi.fn().mockResolvedValue({ ok: true });
    vi.stubGlobal("fetch", fetchMock);
    const dictionary = await setup();
    fillRequired(dictionary);
    fireEvent.change(field(dictionary.designersPage.portfolioLabel), {
      target: { value: "instagram.com/olena" },
    });
    fireEvent.click(
      screen.getByRole("button", { name: dictionary.designersPage.submitCta }),
    );

    await waitFor(() => expect(fetchMock).toHaveBeenCalledTimes(1));
    const body = JSON.parse(
      (fetchMock.mock.calls[0][1] as RequestInit).body as string,
    );
    expect(body.portfolioUrl).toBe("instagram.com/olena");
    await waitForConversion();
  });

  it("sends the qualification answers to both the API and the analytics event", async () => {
    // Two separate call sites build this payload — the fetch body and the
    // `designer_inquiry` event — and an answer that reached only one of them
    // would leave the admin panel and GA4 disagreeing about the same lead.
    const fetchMock = vi.fn().mockResolvedValue({ ok: true });
    vi.stubGlobal("fetch", fetchMock);
    const dictionary = await setup();
    fillRequired(dictionary);
    fireEvent.change(field(dictionary.leadQualification.projectTypeLabel), {
      target: { value: "commercial" },
    });
    fireEvent.change(field(dictionary.leadQualification.timelineLabel), {
      target: { value: "quarter" },
    });
    fireEvent.click(
      screen.getByRole("button", { name: dictionary.designersPage.submitCta }),
    );

    await waitFor(() => expect(fetchMock).toHaveBeenCalledTimes(1));
    const body = JSON.parse(
      (fetchMock.mock.calls[0][1] as RequestInit).body as string,
    );
    expect(body.projectType).toBe("commercial");
    expect(body.timeline).toBe("quarter");

    await waitFor(() => expect(designerEvents()).toHaveLength(1));
    expect(designerEvents()[0]).toMatchObject({
      projectType: "commercial",
      timeline: "quarter",
    });
  });

  it("leaves the questions out of the request when they were skipped", async () => {
    // Not `projectType: ""` — the server enum is `.optional()`, so an empty
    // string is an invalid answer rather than an absent one and would 400 the
    // whole enquiry over a question nobody had to answer.
    const fetchMock = vi.fn().mockResolvedValue({ ok: true });
    vi.stubGlobal("fetch", fetchMock);
    const dictionary = await setup();
    fillRequired(dictionary);
    fireEvent.click(
      screen.getByRole("button", { name: dictionary.designersPage.submitCta }),
    );

    await waitFor(() => expect(fetchMock).toHaveBeenCalledTimes(1));
    const body = JSON.parse(
      (fetchMock.mock.calls[0][1] as RequestInit).body as string,
    );
    expect(body).not.toHaveProperty("projectType");
    expect(body).not.toHaveProperty("timeline");
    await waitForConversion();
  });

  it("lets an answer be taken back", async () => {
    // The placeholder is a real selectable option, not a disabled prompt: a
    // designer who picked "commercial" by mistake can return to no answer.
    const fetchMock = vi.fn().mockResolvedValue({ ok: true });
    vi.stubGlobal("fetch", fetchMock);
    const dictionary = await setup();
    fillRequired(dictionary);
    const projectType = field(dictionary.leadQualification.projectTypeLabel);
    fireEvent.change(projectType, { target: { value: "commercial" } });
    fireEvent.change(projectType, { target: { value: "" } });
    fireEvent.click(
      screen.getByRole("button", { name: dictionary.designersPage.submitCta }),
    );

    await waitFor(() => expect(fetchMock).toHaveBeenCalledTimes(1));
    const body = JSON.parse(
      (fetchMock.mock.calls[0][1] as RequestInit).body as string,
    );
    expect(body).not.toHaveProperty("projectType");
    await waitForConversion();
  });

  it("reports the conversion only after the server accepted the lead", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue({ ok: true }));
    const dictionary = await setup();
    fillRequired(dictionary);
    fireEvent.click(
      screen.getByRole("button", { name: dictionary.designersPage.submitCta }),
    );

    await waitFor(() => expect(designerEvents()).toHaveLength(1));
    expect(designerEvents()[0]).toMatchObject({
      event: "designer_inquiry",
      location: "designers_page",
    });
  });

  it("hashes what the designer typed, and pushes only the hash", async () => {
    // The whole Enhanced Conversions chain in one test: a real address and a
    // real phone go into the form, and what comes out on the dataLayer is the
    // digest Google will compute from the same details — with no trace of the
    // plaintext. The expected values come from Node's `crypto`, not from the
    // code under test.
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue({ ok: true }));
    const dictionary = await setup();
    fillRequired(dictionary, "  Olena@Studio.Example ");
    fireEvent.click(
      screen.getByRole("button", { name: dictionary.designersPage.submitCta }),
    );

    await waitFor(() => expect(designerEvents()).toHaveLength(1));
    const event = designerEvents()[0];
    expect(event.user_data).toEqual({
      sha256_email_address:
        "75dbddfe4742c92eecdd3b57ccd8e8bf9cebf516619153c52da0eb2a2d1cd884",
      sha256_phone_number:
        "6a115656b1d0ab9d381d2cfd9405bfc084fabebfc5ffb50a0e3f9435b9c913a6",
    });

    // Belt and braces on the thing that cannot be undone: nothing anywhere in
    // the queue spells out the address or the number.
    const queue = JSON.stringify(window.dataLayer ?? []);
    expect(queue.toLowerCase()).not.toContain("olena@studio.example");
    expect(queue).not.toContain("380671112233");
  });

  it("still measures the lead when there is nothing hashable", async () => {
    // A conversion without the enhancement is the behaviour we had before, and
    // it is far better than a conversion that never fires. This is the failure
    // path that must not cascade.
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue({ ok: true }));
    const dictionary = await setup();
    fillRequired(dictionary);
    fireEvent.change(field(dictionary.leadFields.phoneLabel), {
      target: { value: "5551234567" }, // no country code we can infer
    });
    fireEvent.change(field(dictionary.designersPage.emailLabel), {
      target: { value: "olena@studio.example" },
    });
    fireEvent.click(
      screen.getByRole("button", { name: dictionary.designersPage.submitCta }),
    );

    await waitFor(() => expect(designerEvents()).toHaveLength(1));
    expect(designerEvents()[0].user_data).toEqual({
      sha256_email_address:
        "75dbddfe4742c92eecdd3b57ccd8e8bf9cebf516619153c52da0eb2a2d1cd884",
    });
  });

  it("counts nothing when the server refused the lead", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue({ ok: false }));
    const dictionary = await setup();
    fillRequired(dictionary);
    fireEvent.click(
      screen.getByRole("button", { name: dictionary.designersPage.submitCta }),
    );

    expect(
      await screen.findByText(dictionary.designersPage.errorMessage),
    ).toBeInTheDocument();
    expect(designerEvents()).toHaveLength(0);
  });
});
