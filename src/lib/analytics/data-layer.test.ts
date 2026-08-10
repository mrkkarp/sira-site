import { describe, expect, it, beforeEach } from "vitest";
import { gtag, pushEvent } from "@/lib/analytics/data-layer";

/**
 * The queue is the whole contract with GTM, and both of its failure modes are
 * silent: an event pushed into a queue that does not exist simply vanishes,
 * and a gtag *command* pushed as an array is accepted by `push` and then
 * ignored by the container. Neither throws. Both of them look, from the app's
 * side, exactly like working.
 */
describe("data-layer", () => {
  beforeEach(() => {
    delete window.dataLayer;
  });

  it("creates the queue on first use", () => {
    expect(window.dataLayer).toBeUndefined();
    expect(pushEvent({ event: "quote_request" })).toBe(true);
    expect(window.dataLayer).toEqual([{ event: "quote_request" }]);
  });

  it("appends to a queue GTM's own snippet created first", () => {
    // Whichever of us runs first makes the array; nothing already in it may be
    // dropped, because GTM replays the queue from index 0 when it initialises.
    window.dataLayer = [{ "gtm.start": 1 }];
    pushEvent({ event: "add_to_cart", value: 19600 });
    expect(window.dataLayer).toEqual([
      { "gtm.start": 1 },
      { event: "add_to_cart", value: 19600 },
    ]);
  });

  it("preserves the order events were fired in", () => {
    pushEvent({ event: "add_to_cart" });
    pushEvent({ event: "begin_checkout" });
    pushEvent({ event: "purchase" });
    expect(window.dataLayer?.map((entry) => (entry as { event: string }).event)).toEqual([
      "add_to_cart",
      "begin_checkout",
      "purchase",
    ]);
  });

  /**
   * Found against the live container, not reasoned about: GTM merges every
   * push into one running model, so a key keeps its last value until something
   * overwrites it. A visitor who priced a 19 600 UAH sink and then tapped the
   * phone number sent a `phone_click` still carrying that value — and the
   * Google Ads conversion tag sent it too, which would teach Smart Bidding
   * that phone taps are worth 19 600 UAH each.
   */
  describe("each event describes only itself", () => {
    it("clears a parameter the next event does not set", () => {
      pushEvent({ event: "quote_request", value: 19600, currency: "UAH" });
      pushEvent({ event: "phone_click", location: "header" });

      const phoneClick = window.dataLayer?.[1] as Record<string, unknown>;
      expect(phoneClick.location).toBe("header");
      // Present and `undefined`, not absent: absent would leave 19 600 standing
      // in GTM's model. `undefined` overwrites it and is then dropped from the
      // outgoing hit — measured, where `null` sends an empty string instead.
      expect("value" in phoneClick).toBe(true);
      expect(phoneClick.value).toBeUndefined();
      expect(phoneClick.currency).toBeUndefined();
    });

    it("leaves the parameters the event does set alone", () => {
      pushEvent({
        event: "purchase",
        transaction_id: "TX-1",
        value: 19600,
        currency: "UAH",
        items: [{ item_id: "Odri" }],
      });
      expect(window.dataLayer?.[0]).toEqual({
        event: "purchase",
        transaction_id: "TX-1",
        value: 19600,
        currency: "UAH",
        items: [{ item_id: "Odri" }],
      });
    });

    it("clears every parameter the measurement plan can carry", () => {
      // The list has to cover all of them. One omission is a single parameter
      // that silently keeps a stale value on every later event, which is
      // exactly the failure this whole mechanism exists to make impossible.
      pushEvent({ event: "phone_click" });
      expect(Object.keys(window.dataLayer?.[0] as object).sort()).toEqual([
        "channel",
        "currency",
        "event",
        // Meta's deduplication key. A stale one here does not merely misreport
        // a number — it makes Meta discard a genuinely different event as a
        // duplicate of the lead before it.
        "event_id",
        "items",
        "location",
        "projectType",
        "timeline",
        "transaction_id",
        "user_data",
        "value",
      ]);
    });
  });

  it("pushes gtag commands as a real Arguments object, not an array", () => {
    // The distinction is the entire reason `toArguments` exists. GTM tells a
    // command from an event by the type of what was pushed: an `Arguments`
    // object is a command, a plain object is an event, an array is neither and
    // is discarded — which would leave Consent Mode stuck at denied with no
    // error anywhere to say so.
    gtag("consent", "default", { ad_storage: "denied" });
    const pushed = window.dataLayer?.[0];
    expect(Array.isArray(pushed)).toBe(false);
    expect(Object.prototype.toString.call(pushed)).toBe("[object Arguments]");
    expect(Array.from(pushed as IArguments)).toEqual([
      "consent",
      "default",
      { ad_storage: "denied" },
    ]);
  });

  it("reports whether the push actually landed", () => {
    // A no-op that reports success is how a measurement plan quietly stops
    // measuring; the return value is what every caller above keys off.
    expect(pushEvent({ event: "phone_click" })).toBe(true);
    expect(gtag("consent", "update", {})).toBe(true);
  });
});
