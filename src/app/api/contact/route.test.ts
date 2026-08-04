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
  return new NextRequest("http://localhost:3000/api/contact", {
    method: "POST",
    headers: {
      host: "localhost:3000",
      "content-type": "application/json",
      ...headers,
    },
    body: JSON.stringify(body),
  });
}

describe("POST /api/contact", () => {
  beforeEach(() => {
    __resetRateLimitForTests();
    createMock.mockReset();
    notifyMock.mockReset();
    createMock.mockResolvedValue({
      id: "1",
      type: "contact",
      name: "Марко",
      phone: "+380671112233",
    });
  });

  it("persists a contact lead and notifies staff", async () => {
    const response = await POST(
      makeRequest(
        {
          name: "Марко",
          phone: "+380671112233",
          email: "marko@example.com",
          message: "Цікавить раковина для ванної 80 см.",
        },
        { referer: "http://localhost:3000/contact" },
      ),
    );

    expect(await response.json()).toEqual({ ok: true });
    expect(createMock).toHaveBeenCalledWith(
      expect.objectContaining({
        type: "contact",
        status: "new",
        locale: "uk",
        sourcePath: "/contact",
        name: "Марко",
        phone: "+380671112233",
        email: "marko@example.com",
        message: "Цікавить раковина для ванної 80 см.",
      }),
    );
    expect(notifyMock).toHaveBeenCalledTimes(1);
  });

  it("accepts a submission with no email at all", async () => {
    // The whole reason `email` is optional here: the workshop replies by phone
    // or Viber, and a required email would cost real enquiries in exchange for
    // a channel this market does not use. An empty string must therefore reach
    // the repository as `undefined`, not as `""` — `LeadRequestSchema` would
    // reject the latter as an invalid address.
    const response = await POST(
      makeRequest({
        name: "Марко",
        phone: "+380671112233",
        email: "",
        message: "Передзвоніть, будь ласка.",
      }),
    );

    expect(await response.json()).toEqual({ ok: true });
    expect(createMock).toHaveBeenCalledWith(
      expect.objectContaining({ email: undefined }),
    );
  });

  it("rejects a submission with no message", async () => {
    const response = await POST(
      makeRequest({ name: "Марко", phone: "+380671112233" }),
    );
    expect(response.status).toBe(400);
    expect(createMock).not.toHaveBeenCalled();
  });

  it("rejects a phone that is not a phone number", async () => {
    const response = await POST(
      makeRequest({ name: "Марко", phone: "12", message: "Привіт" }),
    );
    expect(response.status).toBe(400);
    expect(createMock).not.toHaveBeenCalled();
  });

  it("pretends to succeed when the honeypot is filled, and writes nothing", async () => {
    // Indistinguishable from a real success at the HTTP level, on purpose: a
    // bot that can tell rejection from acceptance simply retries without the
    // field.
    const response = await POST(
      makeRequest({
        name: "Bot",
        phone: "+380671112233",
        message: "buy followers",
        [HONEYPOT_FIELD]: "https://spam.example",
      }),
    );

    expect(response.status).toBe(200);
    expect(await response.json()).toEqual({ ok: true });
    expect(createMock).not.toHaveBeenCalled();
    expect(notifyMock).not.toHaveBeenCalled();
  });

  it("rejects a cross-origin submission", async () => {
    const response = await POST(
      makeRequest(
        {
          name: "Марко",
          phone: "+380671112233",
          message: "Привіт",
        },
        { origin: "https://evil.example" },
      ),
    );

    expect(response.status).toBe(403);
    expect(createMock).not.toHaveBeenCalled();
  });

  it("rate-limits a flood from one client", async () => {
    const send = () =>
      POST(
        makeRequest({
          name: "Марко",
          phone: "+380671112233",
          message: "Привіт",
        }),
      );
    for (let i = 0; i < 5; i += 1) {
      expect((await send()).status).toBe(200);
    }
    expect((await send()).status).toBe(429);
    expect(createMock).toHaveBeenCalledTimes(5);
  });

  it("still accepts the lead when staff notification fails", async () => {
    // A dead RESEND_API_KEY must not turn a captured lead into a 500 the
    // visitor sees as "try again" — the lead is already in the database by the
    // time the email is attempted.
    notifyMock.mockRejectedValueOnce(new Error("smtp down"));
    const response = await POST(
      makeRequest({
        name: "Марко",
        phone: "+380671112233",
        message: "Привіт",
      }),
    );

    expect(response.status).toBe(200);
    expect(createMock).toHaveBeenCalledTimes(1);
  });
});
