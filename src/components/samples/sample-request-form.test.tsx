import { describe, expect, it, vi, beforeEach } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { getDictionary } from "@/i18n/get-dictionary";
import { SampleRequestForm } from "@/components/samples/sample-request-form";
import { resetConsentModeForTests } from "@/lib/analytics/consent-mode";
import type { Product, ProductVariant } from "@/lib/schemas/product";

const base: ProductVariant = {
  sku: "Odri",
  colorLabel: "Сірий базовий",
  price: 19600,
  photo: "/odri.jpg",
  description: "",
};

const customColour: ProductVariant = {
  sku: "Odri color",
  colorLabel: "Свій колір",
  price: 23400,
  photo: "/odri-color.jpg",
  description: "",
  contactRequired: true,
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

const sampleEvents = () =>
  (window.dataLayer ?? []).filter(
    (entry): entry is Record<string, unknown> =>
      Object.prototype.toString.call(entry) === "[object Object]" &&
      (entry as { event?: string }).event === "sample_request",
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
 * `dataLayer`, failing an assertion that has nothing to do with it. Every test
 * here that submits successfully has to end on this.
 */
async function waitForConversion() {
  await waitFor(() => expect(sampleEvents()).toHaveLength(1));
}

describe("SampleRequestForm", () => {
  beforeEach(() => {
    vi.restoreAllMocks();
    delete window.dataLayer;
    resetConsentModeForTests();
  });

  async function setup(props: Partial<{ product: Product; variant: ProductVariant; location: string }> = {}) {
    const dictionary = await getDictionary("uk");
    render(
      <SampleRequestForm
        dictionary={dictionary}
        location={props.location ?? "samples_page"}
        product={props.product}
        variant={props.variant}
      />,
    );
    return dictionary;
  }

  function fillRequired(dictionary: Awaited<ReturnType<typeof getDictionary>>) {
    fireEvent.change(field(dictionary.leadFields.nameLabel), {
      target: { value: "Марко" },
    });
    fireEvent.change(field(dictionary.leadFields.phoneLabel), {
      target: { value: "+380671112233" },
    });
    fireEvent.change(field(dictionary.samplesPage.addressLabel), {
      target: { value: "Київ, Нова пошта, відділення 12" },
    });
  }

  it("posts the request to /api/sample with the delivery address", async () => {
    const fetchMock = vi.fn().mockResolvedValue({ ok: true });
    vi.stubGlobal("fetch", fetchMock);

    const dictionary = await setup();
    fillRequired(dictionary);
    fireEvent.change(field(dictionary.samplesPage.finishesLabel), {
      target: { value: "Сірий базовий і графіт" },
    });
    fireEvent.click(
      screen.getByRole("button", { name: dictionary.samplesPage.submitCta }),
    );

    await waitFor(() => expect(fetchMock).toHaveBeenCalledTimes(1));
    const [url, init] = fetchMock.mock.calls[0];
    expect(url).toBe("/api/sample");
    expect(JSON.parse((init as RequestInit).body as string)).toEqual({
      name: "Марко",
      phone: "+380671112233",
      email: "",
      address: "Київ, Нова пошта, відділення 12",
      message: "Сірий базовий і графіт",
      companyWebsite: "",
    });

    expect(
      await screen.findByText(dictionary.samplesPage.successMessage),
    ).toBeInTheDocument();
    await waitForConversion();
  });

  it("will not submit without somewhere to post the sample", async () => {
    // A sample request with no address is a message, not a request — the
    // workshop would have a lead it cannot act on.
    const fetchMock = vi.fn();
    vi.stubGlobal("fetch", fetchMock);
    const dictionary = await setup();
    fireEvent.change(field(dictionary.leadFields.nameLabel), {
      target: { value: "Марко" },
    });
    fireEvent.change(field(dictionary.leadFields.phoneLabel), {
      target: { value: "+380671112233" },
    });
    fireEvent.click(
      screen.getByRole("button", { name: dictionary.samplesPage.submitCta }),
    );

    expect(
      await screen.findByText(dictionary.samplesPage.requiredAddress),
    ).toBeInTheDocument();
    expect(field(dictionary.samplesPage.addressLabel)).toHaveFocus();
    expect(fetchMock).not.toHaveBeenCalled();
    expect(sampleEvents()).toHaveLength(0);
  });

  it("sends the product slug when rendered from a product page", async () => {
    // Dropped at write time today — storefront ids are slugs and Payload wants
    // numeric relation ids — but sent anyway, so the relation starts being
    // stored the moment products carry real ids, with no change here.
    const fetchMock = vi.fn().mockResolvedValue({ ok: true });
    vi.stubGlobal("fetch", fetchMock);
    const dictionary = await setup({
      product,
      variant: customColour,
      location: "product_page",
    });
    fillRequired(dictionary);
    fireEvent.click(
      screen.getByRole("button", { name: dictionary.samplesPage.submitCta }),
    );

    await waitFor(() => expect(fetchMock).toHaveBeenCalledTimes(1));
    const body = JSON.parse(
      (fetchMock.mock.calls[0][1] as RequestInit).body as string,
    );
    expect(body.productIds).toEqual(["odri"]);
    await waitForConversion();
  });

  it("sends no product reference at all from the samples page", async () => {
    const fetchMock = vi.fn().mockResolvedValue({ ok: true });
    vi.stubGlobal("fetch", fetchMock);
    const dictionary = await setup();
    fillRequired(dictionary);
    fireEvent.click(
      screen.getByRole("button", { name: dictionary.samplesPage.submitCta }),
    );

    await waitFor(() => expect(fetchMock).toHaveBeenCalledTimes(1));
    const body = JSON.parse(
      (fetchMock.mock.calls[0][1] as RequestInit).body as string,
    );
    expect(body).not.toHaveProperty("productIds");
    await waitForConversion();
  });

  it("values a sample asked for from a product page at that product's price", async () => {
    // A sample requested while looking at a specific sink is a materially
    // warmer signal than one requested from the samples page. Flattening the
    // two to one generic number would hide exactly that difference from the
    // campaign bidding on it.
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue({ ok: true }));
    const dictionary = await setup({
      product,
      variant: customColour,
      location: "product_page",
    });
    fillRequired(dictionary);
    fireEvent.click(
      screen.getByRole("button", { name: dictionary.samplesPage.submitCta }),
    );

    await waitFor(() => expect(sampleEvents()).toHaveLength(1));
    expect(sampleEvents()[0]).toMatchObject({
      event: "sample_request",
      location: "product_page",
      value: 23400,
      currency: "UAH",
    });
  });

  it("reports the samples-page request under its own location", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue({ ok: true }));
    const dictionary = await setup();
    fillRequired(dictionary);
    fireEvent.click(
      screen.getByRole("button", { name: dictionary.samplesPage.submitCta }),
    );

    await waitFor(() => expect(sampleEvents()).toHaveLength(1));
    expect(sampleEvents()[0]).toMatchObject({
      event: "sample_request",
      location: "samples_page",
    });
  });

  it("carries both match keys when the visitor filled in the email too", async () => {
    // This is the one lead form where the visitor plausibly gives an address,
    // a phone and an email, so it is where both Enhanced Conversions keys
    // actually travel together — two keys roughly double the chance Google
    // recognises the person behind the conversion. Digests are independent
    // vectors; see `user-data.test.ts`.
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue({ ok: true }));
    const dictionary = await setup();
    fillRequired(dictionary);
    fireEvent.change(field(dictionary.samplesPage.emailLabel), {
      target: { value: "  Olena@Studio.Example " },
    });
    fireEvent.click(
      screen.getByRole("button", { name: dictionary.samplesPage.submitCta }),
    );

    await waitForConversion();
    expect(sampleEvents()[0].user_data).toEqual({
      sha256_email_address:
        "75dbddfe4742c92eecdd3b57ccd8e8bf9cebf516619153c52da0eb2a2d1cd884",
      sha256_phone_number:
        "6a115656b1d0ab9d381d2cfd9405bfc084fabebfc5ffb50a0e3f9435b9c913a6",
    });

    const queue = JSON.stringify(window.dataLayer ?? []);
    expect(queue.toLowerCase()).not.toContain("olena@studio.example");
    expect(queue).not.toContain("380671112233");
  });

  it("counts nothing when the server refused the request", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue({ ok: false }));
    const dictionary = await setup();
    fillRequired(dictionary);
    fireEvent.click(
      screen.getByRole("button", { name: dictionary.samplesPage.submitCta }),
    );

    expect(
      await screen.findByText(dictionary.samplesPage.errorMessage),
    ).toBeInTheDocument();
    expect(sampleEvents()).toHaveLength(0);
  });
});
