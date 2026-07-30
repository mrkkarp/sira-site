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
  return new NextRequest("http://localhost:3000/api/warranty", {
    method: "POST",
    headers: {
      host: "localhost:3000",
      "content-type": "application/json",
      ...headers,
    },
    body: JSON.stringify(body),
  });
}

describe("POST /api/warranty", () => {
  beforeEach(() => {
    __resetRateLimitForTests();
    createMock.mockReset();
    notifyMock.mockReset();
    createMock.mockResolvedValue({
      id: "1",
      type: "warranty",
      name: "Марко",
      phone: "+380671112233",
    });
  });

  it("persists a real warranty lead with the uploaded photo ids", async () => {
    const response = await POST(
      makeRequest(
        {
          name: "Марко",
          phone: "+380671112233",
          email: "marko@example.com",
          orderNumber: "ORD-123",
          issueDescription: "Тріщина на кромці стільниці",
          photoIds: ["42", "43"],
        },
        { referer: "http://localhost:3000/warranty" },
      ),
    );
    const json = await response.json();

    expect(json).toEqual({ ok: true });
    expect(createMock).toHaveBeenCalledWith(
      expect.objectContaining({
        type: "warranty",
        status: "new",
        locale: "uk",
        sourcePath: "/warranty",
        name: "Марко",
        phone: "+380671112233",
        email: "marko@example.com",
        orderNumber: "ORD-123",
        issueDescription: "Тріщина на кромці стільниці",
        photoIds: ["42", "43"],
      }),
    );
    expect(notifyMock).toHaveBeenCalledTimes(1);
  });

  it("rejects a request missing the required issueDescription", async () => {
    const response = await POST(
      makeRequest({ name: "Марко", phone: "+380671112233" }),
    );
    expect(response.status).toBe(400);
    expect(createMock).not.toHaveBeenCalled();
  });

  it("rejects more photoIds than the allowed maximum", async () => {
    const response = await POST(
      makeRequest({
        name: "Марко",
        phone: "+380671112233",
        issueDescription: "x",
        photoIds: ["1", "2", "3", "4", "5", "6"],
      }),
    );
    expect(response.status).toBe(400);
    expect(createMock).not.toHaveBeenCalled();
  });

  it("pretends to succeed when the honeypot field is filled", async () => {
    const response = await POST(
      makeRequest({
        name: "Bot",
        phone: "0000000",
        issueDescription: "x",
        [HONEYPOT_FIELD]: "spam",
      }),
    );
    const json = await response.json();
    expect(json).toEqual({ ok: true });
    expect(createMock).not.toHaveBeenCalled();
  });
});
