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
  return new NextRequest("http://localhost:3000/api/designer", {
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
  name: "Олена",
  phone: "+380671112233",
  email: "olena@studio.example",
  companyName: "Studio Bureau",
  portfolioUrl: "behance.net/olena",
  message: "Готель на 40 номерів, потрібні накладні раковини.",
};

describe("POST /api/designer", () => {
  beforeEach(() => {
    __resetRateLimitForTests();
    createMock.mockReset();
    notifyMock.mockReset();
    createMock.mockResolvedValue({
      id: "1",
      type: "designer",
      name: "Олена",
      phone: "+380671112233",
      email: "olena@studio.example",
    });
  });

  it("persists a designer enquiry with the trade fields intact", async () => {
    const response = await POST(
      makeRequest(validBody, { referer: "http://localhost:3000/designers" }),
    );

    expect(await response.json()).toEqual({ ok: true });
    expect(createMock).toHaveBeenCalledWith(
      expect.objectContaining({
        type: "designer",
        status: "new",
        locale: "uk",
        sourcePath: "/designers",
        name: "Олена",
        email: "olena@studio.example",
        companyName: "Studio Bureau",
        portfolioUrl: "behance.net/olena",
      }),
    );
    expect(notifyMock).toHaveBeenCalledTimes(1);
  });

  it("requires an email, unlike every other form on the site", async () => {
    // Deliberate asymmetry, not an oversight: the trade conversation is
    // drawings, specifications and a quotation — all attachments — and a phone
    // number cannot receive an attachment.
    const response = await POST(
      makeRequest({
        name: validBody.name,
        phone: validBody.phone,
        companyName: validBody.companyName,
        message: validBody.message,
      }),
    );

    expect(response.status).toBe(400);
    expect(createMock).not.toHaveBeenCalled();
  });

  it("accepts a portfolio link with no scheme", async () => {
    // `behance.net/olena` is a perfectly usable answer. Validating this as a
    // URL would reject the most common way a designer actually types it.
    const response = await POST(
      makeRequest({ ...validBody, portfolioUrl: "instagram.com/olena" }),
    );

    expect(response.status).toBe(200);
    expect(createMock).toHaveBeenCalledWith(
      expect.objectContaining({ portfolioUrl: "instagram.com/olena" }),
    );
  });

  it("accepts an enquiry with no company and no portfolio", async () => {
    const response = await POST(
      makeRequest({
        name: "Олена",
        phone: "+380671112233",
        email: "olena@studio.example",
        companyName: "",
        portfolioUrl: "",
        message: "",
      }),
    );

    expect(response.status).toBe(200);
    expect(createMock).toHaveBeenCalledWith(
      expect.objectContaining({
        companyName: undefined,
        portfolioUrl: undefined,
        message: undefined,
      }),
    );
  });

  it("stores the qualification answers when they are given", async () => {
    const response = await POST(
      makeRequest({
        ...validBody,
        projectType: "commercial",
        timeline: "quarter",
      }),
    );

    expect(response.status).toBe(200);
    expect(createMock).toHaveBeenCalledWith(
      expect.objectContaining({
        projectType: "commercial",
        timeline: "quarter",
      }),
    );
  });

  it("accepts an enquiry that answers neither question", async () => {
    // Both are optional by design — see `domain/leads/qualification.ts`. A
    // designer who skips them is still the most valuable lead on the site, and
    // a 400 here would throw that away over a question nobody had to answer.
    const response = await POST(makeRequest(validBody));

    expect(response.status).toBe(200);
    expect(createMock).toHaveBeenCalledWith(
      expect.objectContaining({ projectType: undefined, timeline: undefined }),
    );
  });

  it("rejects a qualification value that is not one of the options", async () => {
    // The strict enum is what makes the stored answer groupable in the admin
    // panel and in GA4 without cleaning. Accepting free text here — or quietly
    // coercing `""` to "no answer" — is how a client that has stopped sending
    // real answers goes unnoticed.
    const response = await POST(
      makeRequest({ ...validBody, projectType: "" }),
    );

    expect(response.status).toBe(400);
    expect(createMock).not.toHaveBeenCalled();
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
