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
  return new NextRequest("http://localhost:3000/api/quote", {
    method: "POST",
    headers: {
      host: "localhost:3000",
      "content-type": "application/json",
      ...headers,
    },
    body: JSON.stringify(body),
  });
}

describe("POST /api/quote", () => {
  beforeEach(() => {
    __resetRateLimitForTests();
    createMock.mockReset();
    notifyMock.mockReset();
    createMock.mockResolvedValue({
      id: "1",
      type: "quote",
      name: "Марко",
      phone: "+380671112233",
    });
  });

  it("persists a real quote lead with the structured product/variant reference", async () => {
    const response = await POST(
      makeRequest(
        {
          name: "Марко",
          phone: "+380671112233",
          message: "Odri (Odri color), колір: Свій колір",
          productId: "odri",
          variantId: "Odri color",
        },
        { referer: "http://localhost:3000/products/odri" },
      ),
    );
    const json = await response.json();

    expect(json).toEqual({ ok: true });
    expect(createMock).toHaveBeenCalledWith(
      expect.objectContaining({
        type: "quote",
        status: "new",
        locale: "uk",
        sourcePath: "/products/odri",
        productId: "odri",
        variantId: "Odri color",
        message: "Odri (Odri color), колір: Свій колір",
      }),
    );
    expect(notifyMock).toHaveBeenCalledTimes(1);
  });

  it("rejects a request missing the required message", async () => {
    const response = await POST(
      makeRequest({ name: "Марко", phone: "+380671112233" }),
    );
    expect(response.status).toBe(400);
    expect(createMock).not.toHaveBeenCalled();
  });

  it("pretends to succeed when the honeypot field is filled", async () => {
    const response = await POST(
      makeRequest({
        name: "Bot",
        phone: "0000000",
        message: "x",
        [HONEYPOT_FIELD]: "spam",
      }),
    );
    const json = await response.json();
    expect(json).toEqual({ ok: true });
    expect(createMock).not.toHaveBeenCalled();
  });
});
