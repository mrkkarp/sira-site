import { describe, expect, it, vi, beforeEach } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { getDictionary } from "@/i18n/get-dictionary";
import { WarrantyRequestForm } from "@/components/forms/warranty-request-form";

/**
 * Phase I — warranty-claim form. Covers the required-field validation
 * (name/phone/issue description, mirroring `/api/warranty/route.ts`'s
 * own Zod schema) and that a successfully uploaded photo's real `media`
 * id — never raw file bytes — ends up in the final submission's
 * `photoIds`.
 */
describe("WarrantyRequestForm", () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  it("submits the required fields without photos", async () => {
    const fetchMock = vi.fn().mockResolvedValue({ ok: true });
    vi.stubGlobal("fetch", fetchMock);

    const dictionary = await getDictionary("uk");
    render(<WarrantyRequestForm dictionary={dictionary} />);

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
    fireEvent.change(
      screen.getByPlaceholderText(dictionary.warranty.issuePlaceholder),
      {
        target: { value: "Тріщина на кромці" },
      },
    );
    fireEvent.click(
      screen.getByRole("button", { name: dictionary.warranty.submitCta }),
    );

    await waitFor(() => expect(fetchMock).toHaveBeenCalledTimes(1));
    const [url, init] = fetchMock.mock.calls[0];
    expect(url).toBe("/api/warranty");
    const body = JSON.parse((init as RequestInit).body as string);
    expect(body).toEqual({
      name: "Марко",
      phone: "+380671112233",
      email: undefined,
      orderNumber: undefined,
      issueDescription: "Тріщина на кромці",
      photoIds: undefined,
      companyWebsite: "",
    });

    expect(
      await screen.findByText(dictionary.warranty.successMessage),
    ).toBeInTheDocument();
  });

  it("shows required-field errors instead of submitting when fields are empty", async () => {
    const fetchMock = vi.fn();
    vi.stubGlobal("fetch", fetchMock);

    const dictionary = await getDictionary("uk");
    render(<WarrantyRequestForm dictionary={dictionary} />);

    fireEvent.click(
      screen.getByRole("button", { name: dictionary.warranty.submitCta }),
    );

    expect(
      await screen.findByText(dictionary.callback.requiredName),
    ).toBeInTheDocument();
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("uploads a selected photo and includes its real id in the submission", async () => {
    const fetchMock = vi.fn().mockImplementation((url: string) => {
      if (url === "/api/warranty/upload") {
        return Promise.resolve({
          ok: true,
          json: async () => ({ ok: true, id: "77" }),
        });
      }
      return Promise.resolve({ ok: true, json: async () => ({ ok: true }) });
    });
    vi.stubGlobal("fetch", fetchMock);

    const dictionary = await getDictionary("uk");
    render(<WarrantyRequestForm dictionary={dictionary} />);

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
    fireEvent.change(
      screen.getByPlaceholderText(dictionary.warranty.issuePlaceholder),
      {
        target: { value: "Тріщина на кромці" },
      },
    );

    const file = new File(["photo-bytes"], "crack.jpg", { type: "image/jpeg" });
    const fileInput = document.querySelector(
      'input[type="file"]',
    ) as HTMLInputElement;
    fireEvent.change(fileInput, { target: { files: [file] } });

    await waitFor(() =>
      expect(screen.getByText("crack.jpg")).toBeInTheDocument(),
    );
    await waitFor(() =>
      expect(fetchMock).toHaveBeenCalledWith(
        "/api/warranty/upload",
        expect.objectContaining({ method: "POST" }),
      ),
    );

    await waitFor(() =>
      expect(
        screen.queryByText(dictionary.warranty.uploadingPhoto),
      ).not.toBeInTheDocument(),
    );

    fireEvent.click(
      screen.getByRole("button", { name: dictionary.warranty.submitCta }),
    );

    await waitFor(() =>
      expect(fetchMock).toHaveBeenCalledWith(
        "/api/warranty",
        expect.objectContaining({ method: "POST" }),
      ),
    );
    const warrantyCall = fetchMock.mock.calls.find(
      ([url]) => url === "/api/warranty",
    )!;
    const body = JSON.parse((warrantyCall[1] as RequestInit).body as string);
    expect(body.photoIds).toEqual(["77"]);
  });
});
