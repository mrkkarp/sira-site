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
  return new NextRequest("http://localhost:3000/api/callback", {
    method: "POST",
    headers: {
      host: "localhost:3000",
      "content-type": "application/json",
      ...headers,
    },
    body: JSON.stringify(body),
  });
}

describe("POST /api/callback", () => {
  beforeEach(() => {
    __resetRateLimitForTests();
    createMock.mockReset();
    notifyMock.mockReset();
    createMock.mockResolvedValue({
      id: "1",
      type: "callback",
      name: "Марко",
      phone: "+380671112233",
    });
  });

  it("persists a real callback lead and notifies staff", async () => {
    const response = await POST(
      makeRequest(
        { name: "Марко", phone: "+380671112233" },
        { referer: "http://localhost:3000/uk" },
      ),
    );
    const json = await response.json();

    expect(json).toEqual({ ok: true });
    expect(createMock).toHaveBeenCalledWith(
      expect.objectContaining({
        type: "callback",
        status: "new",
        locale: "uk",
        name: "Марко",
        phone: "+380671112233",
      }),
    );
    expect(notifyMock).toHaveBeenCalledTimes(1);
  });

  it("rejects invalid input without touching the repository", async () => {
    const response = await POST(makeRequest({ name: "", phone: "123" }));
    expect(response.status).toBe(400);
    const json = await response.json();
    expect(json.ok).toBe(false);
    expect(createMock).not.toHaveBeenCalled();
  });

  it("pretends to succeed when the honeypot field is filled, without persisting anything", async () => {
    const response = await POST(
      makeRequest({
        name: "Bot",
        phone: "0000000",
        [HONEYPOT_FIELD]: "https://spam.example",
      }),
    );
    const json = await response.json();
    expect(json).toEqual({ ok: true });
    expect(createMock).not.toHaveBeenCalled();
  });

  it("rate-limits repeated requests from the same client", async () => {
    for (let i = 0; i < 5; i++) {
      await POST(
        makeRequest(
          { name: "Марко", phone: "+380671112233" },
          { "x-forwarded-for": "9.9.9.9" },
        ),
      );
    }
    const response = await POST(
      makeRequest(
        { name: "Марко", phone: "+380671112233" },
        { "x-forwarded-for": "9.9.9.9" },
      ),
    );
    expect(response.status).toBe(429);
  });

  it("rejects cross-origin requests", async () => {
    const response = await POST(
      makeRequest(
        { name: "Марко", phone: "+380671112233" },
        { origin: "https://evil.example" },
      ),
    );
    expect(response.status).toBe(403);
    expect(createMock).not.toHaveBeenCalled();
  });
});
