import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { sendMetaServerEvent } from "@/lib/analytics/meta/conversions-api";

/**
 * The transport, checked mostly for the things that fail silently.
 *
 * A Conversions API integration that is wrong does not error. It returns 200
 * and the events simply never appear, or appear and never match, or appear in
 * the Test Events tab where nothing counts them. So what is asserted here is
 * the shape of the request — and, more than anything, that the access token
 * never appears anywhere except the request body.
 */
const TOKEN = "EAAtest-secret-token-value";
const PIXEL = "582014448861090";

function stubFetch(response: Partial<Response> = {}) {
  const fetchMock = vi.fn().mockResolvedValue({
    ok: true,
    status: 200,
    text: async () => "{}",
    ...response,
  });
  vi.stubGlobal("fetch", fetchMock);
  return fetchMock;
}

function sentBody(fetchMock: ReturnType<typeof vi.fn>) {
  return JSON.parse((fetchMock.mock.calls[0][1] as RequestInit).body as string);
}

describe("meta/conversions-api", () => {
  beforeEach(() => {
    vi.stubEnv("META_PIXEL_ID", PIXEL);
    vi.stubEnv("META_CAPI_ACCESS_TOKEN", TOKEN);
    vi.stubEnv("META_CAPI_TEST_EVENT_CODE", "");
  });

  afterEach(() => {
    vi.unstubAllEnvs();
    vi.unstubAllGlobals();
    vi.restoreAllMocks();
  });

  it("sends nothing at all when the API is not configured", async () => {
    // Unset must mean off, not a request to `/undefined/events`.
    vi.stubEnv("META_CAPI_ACCESS_TOKEN", "");
    const fetchMock = stubFetch();
    await expect(
      sendMetaServerEvent({
        eventName: "Lead",
        eventId: "abc-123",
        userData: {},
      }),
    ).resolves.toBe("skipped");
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("puts the access token in the body and never in the URL", async () => {
    // A token in a query string is a write credential written into every proxy
    // and platform access log it passes through, for that log's whole retention
    // period. This assertion is the reason the code builds a body at all.
    const fetchMock = stubFetch();
    await sendMetaServerEvent({
      eventName: "Lead",
      eventId: "abc-123",
      userData: {},
    });

    const [url] = fetchMock.mock.calls[0];
    expect(url).toContain(`/${PIXEL}/events`);
    expect(url).not.toContain(TOKEN);
    expect(url).not.toContain("access_token");
    expect(sentBody(fetchMock).access_token).toBe(TOKEN);
  });

  it("sends the event_id and event_name Meta deduplicates on", async () => {
    const fetchMock = stubFetch();
    await sendMetaServerEvent({
      eventName: "Lead",
      eventId: "abc-123",
      eventSourceUrl: "https://odudlab.com/uk/contact",
      contentName: "contact",
      userData: { em: ["deadbeef"] },
    });

    const [event] = sentBody(fetchMock).data;
    expect(event).toMatchObject({
      event_name: "Lead",
      event_id: "abc-123",
      // Not "system_generated": the visitor really did submit a form in a
      // browser, and this is how Meta decides the event is attributable.
      action_source: "website",
      event_source_url: "https://odudlab.com/uk/contact",
      user_data: { em: ["deadbeef"] },
      custom_data: { content_name: "contact" },
    });
    expect(typeof event.event_time).toBe("number");
  });

  it("omits value entirely rather than sending a placeholder", async () => {
    // `NEXT_PUBLIC_LEAD_VALUE_UAH` is the owner's figure and is not set. A zero
    // or an invented number would look identical to a measured one in the Ads
    // UI and Smart Bidding would spend against it.
    const fetchMock = stubFetch();
    await sendMetaServerEvent({
      eventName: "Lead",
      eventId: "abc-123",
      contentName: "designer",
      userData: {},
    });

    const [event] = sentBody(fetchMock).data;
    expect(event.custom_data).toEqual({ content_name: "designer" });
    expect(event.custom_data).not.toHaveProperty("value");
  });

  it("carries value and currency when a real figure exists", async () => {
    const fetchMock = stubFetch();
    await sendMetaServerEvent({
      eventName: "Lead",
      eventId: "abc-123",
      contentName: "quote",
      userData: {},
      value: 23400,
      currency: "UAH",
    });

    expect(sentBody(fetchMock).data[0].custom_data).toEqual({
      content_name: "quote",
      value: 23400,
      currency: "UAH",
    });
  });

  it("routes to Test Events when the code is set", async () => {
    vi.stubEnv("META_CAPI_TEST_EVENT_CODE", "TEST12345");
    const fetchMock = stubFetch();
    await sendMetaServerEvent({
      eventName: "Lead",
      eventId: "abc-123",
      userData: {},
    });
    expect(sentBody(fetchMock).test_event_code).toBe("TEST12345");
  });

  it("reports failure without ever printing the token", async () => {
    // Assumes the worst: that some Graph error message helpfully echoes the
    // request back at us, straight into a log we do not control.
    const errorLog = vi.spyOn(console, "error").mockImplementation(() => {});
    stubFetch({
      ok: false,
      status: 400,
      text: async () => `{"error":{"message":"bad token ${TOKEN}"}}`,
    });

    await expect(
      sendMetaServerEvent({
        eventName: "Lead",
        eventId: "abc-123",
        userData: {},
      }),
    ).resolves.toBe("failed");

    const printed = errorLog.mock.calls.flat().join(" ");
    expect(printed).toContain("400");
    expect(printed).not.toContain(TOKEN);
    expect(printed).toContain("[redacted]");
  });

  it("swallows a network failure rather than rejecting", async () => {
    // Every caller is inside `after()`, where a rejection is an unhandled one.
    vi.spyOn(console, "error").mockImplementation(() => {});
    vi.stubGlobal("fetch", vi.fn().mockRejectedValue(new Error("ETIMEDOUT")));
    await expect(
      sendMetaServerEvent({
        eventName: "Lead",
        eventId: "abc-123",
        userData: {},
      }),
    ).resolves.toBe("failed");
  });
});
