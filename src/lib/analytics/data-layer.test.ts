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
