import { describe, expect, it, vi, beforeEach, afterEach } from "vitest";
import {
  getLeadNotificationAdapter,
  __resetLeadNotificationAdapterForTests,
} from "./lead-notification-adapter";
import type { LeadRequest } from "@/domain/leads/lead-request";

const callbackLead: LeadRequest = {
  id: "1" as LeadRequest["id"],
  type: "callback",
  status: "new",
  locale: "uk",
  createdAt: new Date().toISOString(),
  updatedAt: new Date().toISOString(),
  name: "Марко",
  phone: "+380671112233",
};

describe("getLeadNotificationAdapter", () => {
  const originalEnv = { ...process.env };

  beforeEach(() => {
    vi.restoreAllMocks();
    __resetLeadNotificationAdapterForTests();
    process.env = { ...originalEnv };
    delete process.env.RESEND_API_KEY;
    delete process.env.LEADS_NOTIFICATION_EMAIL;
    delete process.env.EMAIL_FROM;
  });

  afterEach(() => {
    process.env = { ...originalEnv };
  });

  it("falls back to the console adapter when Resend isn't configured", async () => {
    const infoSpy = vi.spyOn(console, "info").mockImplementation(() => {});
    const fetchMock = vi.fn();
    vi.stubGlobal("fetch", fetchMock);

    await getLeadNotificationAdapter().notify(callbackLead);

    expect(fetchMock).not.toHaveBeenCalled();
    expect(infoSpy).toHaveBeenCalledWith(expect.stringContaining("callback"));
  });

  it("calls the Resend API when fully configured", async () => {
    process.env.RESEND_API_KEY = "test-key";
    process.env.LEADS_NOTIFICATION_EMAIL = "sales@odudlab.example";
    process.env.EMAIL_FROM = "noreply@odudlab.example";
    __resetLeadNotificationAdapterForTests();

    const fetchMock = vi.fn().mockResolvedValue({ ok: true });
    vi.stubGlobal("fetch", fetchMock);

    await getLeadNotificationAdapter().notify(callbackLead);

    expect(fetchMock).toHaveBeenCalledTimes(1);
    const [url, init] = fetchMock.mock.calls[0];
    expect(url).toBe("https://api.resend.com/emails");
    expect((init as RequestInit).headers).toMatchObject({
      Authorization: "Bearer test-key",
    });
    const body = JSON.parse((init as RequestInit).body as string);
    expect(body).toMatchObject({
      from: "noreply@odudlab.example",
      to: "sales@odudlab.example",
    });
    expect(body.text).toContain("Марко");
  });

  it("throws when the Resend API responds with an error", async () => {
    process.env.RESEND_API_KEY = "test-key";
    process.env.LEADS_NOTIFICATION_EMAIL = "sales@odudlab.example";
    process.env.EMAIL_FROM = "noreply@odudlab.example";
    __resetLeadNotificationAdapterForTests();

    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue({ ok: false, status: 500 }),
    );

    await expect(
      getLeadNotificationAdapter().notify(callbackLead),
    ).rejects.toThrow("resend_notification_failed");
  });

  it("caches the adapter instance across calls", () => {
    const first = getLeadNotificationAdapter();
    const second = getLeadNotificationAdapter();
    expect(first).toBe(second);
  });
});
