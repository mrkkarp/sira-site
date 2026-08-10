import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { reportLeadToMeta } from "@/lib/analytics/meta/lead-event";

/**
 * The layer that turns an incoming lead request into a Meta server event.
 *
 * Most of what matters here is what gets pulled off the request without the
 * form having to know about it — the click cookies above all. `_fbc` is an
 * exact join back to the ad click that produced the lead; nothing else in the
 * payload comes close, and it is invisible to the form because it is a cookie
 * the pixel wrote.
 */
const TOKEN = "EAAtest-secret-token-value";

function stubFetch() {
  const fetchMock = vi.fn().mockResolvedValue({
    ok: true,
    status: 200,
    text: async () => "{}",
  });
  vi.stubGlobal("fetch", fetchMock);
  return fetchMock;
}

function sentEvent(fetchMock: ReturnType<typeof vi.fn>) {
  return JSON.parse((fetchMock.mock.calls[0][1] as RequestInit).body as string)
    .data[0];
}

function leadRequest(headers: Record<string, string> = {}) {
  return new Request("https://odudlab.com/api/contact", {
    method: "POST",
    headers: {
      referer: "https://odudlab.com/uk/contact",
      "user-agent": "Mozilla/5.0 (iPhone)",
      "x-forwarded-for": "203.0.113.7, 10.0.0.1",
      cookie: "_fbp=fb.1.1700000000.123; _fbc=fb.1.1700000000.AbC_dEf",
      ...headers,
    },
  });
}

describe("meta/lead-event", () => {
  beforeEach(() => {
    vi.stubEnv("META_PIXEL_ID", "582014448861090");
    vi.stubEnv("META_CAPI_ACCESS_TOKEN", TOKEN);
    vi.stubEnv("META_CAPI_TEST_EVENT_CODE", "");
    vi.stubEnv("NEXT_PUBLIC_LEAD_VALUE_UAH", "");
  });

  afterEach(() => {
    vi.unstubAllEnvs();
    vi.unstubAllGlobals();
    vi.restoreAllMocks();
  });

  it("sends nothing when the submission carried no event_id", async () => {
    // The safe direction. The pixel has already reported this lead; an
    // unmatchable server copy would be counted as a second, separate lead, and
    // a conversion count quietly double the truth is worse for bidding than one
    // quietly incomplete.
    const fetchMock = stubFetch();
    await expect(
      reportLeadToMeta(leadRequest(), { form: "contact", phone: "0671112233" }),
    ).resolves.toBe("skipped");
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("carries the click cookies, IP and user agent off the request", async () => {
    const fetchMock = stubFetch();
    await reportLeadToMeta(leadRequest(), {
      form: "contact",
      eventId: "abc-12345678",
      phone: "0671112233",
    });

    const event = sentEvent(fetchMock);
    expect(event.user_data).toMatchObject({
      // Unhashed on purpose — Meta rejects these hashed. They are its own
      // identifiers, not the customer's personal data.
      fbp: "fb.1.1700000000.123",
      fbc: "fb.1.1700000000.AbC_dEf",
      // The client, not our proxy: the first entry of `x-forwarded-for`.
      client_ip_address: "203.0.113.7",
      client_user_agent: "Mozilla/5.0 (iPhone)",
    });
    expect(event.event_source_url).toBe("https://odudlab.com/uk/contact");
    expect(event.custom_data).toEqual({ content_name: "contact" });
  });

  it("hashes the contact details and sends no plaintext", async () => {
    const fetchMock = stubFetch();
    await reportLeadToMeta(leadRequest(), {
      form: "contact",
      eventId: "abc-12345678",
      name: "Олена Коваль",
      email: "Olena@Studio.example",
      phone: "+380 67 111 22 33",
    });

    const event = sentEvent(fetchMock);
    expect(event.user_data.em).toEqual([
      "75dbddfe4742c92eecdd3b57ccd8e8bf9cebf516619153c52da0eb2a2d1cd884",
    ]);
    expect(event.user_data.ph).toEqual([
      "48ff687850a5d70e0d41f26b4e655378ded787325bc4bd4f042027421beb905f",
    ]);
    const serialised = JSON.stringify(event);
    expect(serialised).not.toContain("Olena@Studio.example");
    expect(serialised).not.toContain("380671112233");
    expect(serialised).not.toContain("Олена");
  });

  it("drops a referer that is not an http(s) URL", async () => {
    const fetchMock = stubFetch();
    await reportLeadToMeta(leadRequest({ referer: "javascript:alert(1)" }), {
      form: "contact",
      eventId: "abc-12345678",
    });
    expect(sentEvent(fetchMock)).not.toHaveProperty("event_source_url");
  });

  it("omits value while the owner's lead figure is unset", async () => {
    // `NEXT_PUBLIC_LEAD_VALUE_UAH` is the average order value times the close
    // rate — facts about this business that only the owner has. No default will
    // be invented, so these events are countable but not yet biddable by value.
    const fetchMock = stubFetch();
    await reportLeadToMeta(leadRequest(), {
      form: "designer",
      eventId: "abc-12345678",
    });
    expect(sentEvent(fetchMock).custom_data).toEqual({
      content_name: "designer",
    });
  });

  it("uses the owner's lead figure once it is set", async () => {
    vi.stubEnv("NEXT_PUBLIC_LEAD_VALUE_UAH", "4200");
    const fetchMock = stubFetch();
    await reportLeadToMeta(leadRequest(), {
      form: "designer",
      eventId: "abc-12345678",
    });
    expect(sentEvent(fetchMock).custom_data).toEqual({
      content_name: "designer",
      value: 4200,
      currency: "UAH",
    });
  });
});
