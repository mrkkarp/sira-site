import { describe, expect, it, vi, beforeEach } from "vitest";
import { NextRequest } from "next/server";
import { HONEYPOT_FIELD } from "@/lib/forms/honeypot";
import { __resetRateLimitForTests } from "@/lib/forms/rate-limit";
import { POST } from "./route";

const createMock = vi.fn();
const notifyMock = vi.fn();

vi.mock("@/repositories/lead-repository", () => ({
  getLeadRepository: async () => ({ create: createMock, findById: vi.fn() }),
}));

vi.mock("@/lib/email/lead-notification-adapter", () => ({
  getLeadNotificationAdapter: () => ({ notify: notifyMock }),
}));

function makeRequest(body: unknown, headers: Record<string, string> = {}) {
  return new NextRequest("http://localhost:3000/api/sample", {
    method: "POST",
    headers: {
      host: "localhost:3000",
      "content-type": "application/json",
      ...headers,
    },
    body: JSON.stringify(body),
  });
}

const validBody = {
  name: "Марко",
  phone: "+380671112233",
  address: "Київ, Нова пошта, відділення 12",
  message: "Сірий базовий і темніший відтінок під графіт",
};

describe("POST /api/sample", () => {
  beforeEach(() => {
    __resetRateLimitForTests();
    createMock.mockReset();
    notifyMock.mockReset();
    createMock.mockResolvedValue({
      id: "1",
      type: "sample",
      name: "Марко",
      phone: "+380671112233",
      address: "Київ, Нова пошта, відділення 12",
      productIds: [],
    });
  });

  it("persists a sample request with the delivery address", async () => {
    const response = await POST(
      makeRequest(validBody, { referer: "http://localhost:3000/samples" }),
    );

    expect(await response.json()).toEqual({ ok: true });
    expect(createMock).toHaveBeenCalledWith(
      expect.objectContaining({
        type: "sample",
        status: "new",
        locale: "uk",
        sourcePath: "/samples",
        name: "Марко",
        address: "Київ, Нова пошта, відділення 12",
        message: "Сірий базовий і темніший відтінок під графіт",
      }),
    );
    expect(notifyMock).toHaveBeenCalledTimes(1);
  });

  it("rejects a sample request with nowhere to send the sample", async () => {
    // Without an address this is a message, not a sample request — and the
    // workshop would have a lead it cannot act on.
    const response = await POST(
      makeRequest({
        name: validBody.name,
        phone: validBody.phone,
        message: validBody.message,
      }),
    );

    expect(response.status).toBe(400);
    expect(createMock).not.toHaveBeenCalled();
  });

  it("accepts a request with no product reference at all", async () => {
    // The samples page sends none. `productIds` must therefore default to an
    // empty array rather than being required: `PayloadLeadRepository.create()`
    // re-parses what it wrote, so a `.min(1)` here would turn a successfully
    // committed lead into a 500 the customer reads as "it failed".
    const response = await POST(makeRequest(validBody));

    expect(response.status).toBe(200);
    expect(createMock).toHaveBeenCalledWith(
      expect.objectContaining({ productIds: [] }),
    );
  });

  it("carries the product slug through when sent from a product page", async () => {
    const response = await POST(
      makeRequest(
        { ...validBody, productIds: ["odri"] },
        { referer: "http://localhost:3000/products/odri" },
      ),
    );

    expect(response.status).toBe(200);
    expect(createMock).toHaveBeenCalledWith(
      expect.objectContaining({
        productIds: ["odri"],
        sourcePath: "/products/odri",
      }),
    );
  });

  it("pretends to succeed when the honeypot is filled, and writes nothing", async () => {
    const response = await POST(
      makeRequest({ ...validBody, [HONEYPOT_FIELD]: "https://spam.example" }),
    );

    expect(response.status).toBe(200);
    expect(await response.json()).toEqual({ ok: true });
    expect(createMock).not.toHaveBeenCalled();
    expect(notifyMock).not.toHaveBeenCalled();
  });

  it("rejects a cross-origin submission", async () => {
    const response = await POST(
      makeRequest(validBody, { origin: "https://evil.example" }),
    );
    expect(response.status).toBe(403);
    expect(createMock).not.toHaveBeenCalled();
  });
});
