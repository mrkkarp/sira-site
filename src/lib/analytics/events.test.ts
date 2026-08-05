import { describe, expect, it, beforeEach, afterEach, vi } from "vitest";
import {
  itemFor,
  resetEventsForTests,
  trackAddToCart,
  trackBeginCheckout,
  trackContactSubmit,
  trackDesignerInquiry,
  trackMessengerClick,
  trackPhoneClick,
  trackPurchase,
  trackQuoteRequest,
  trackSampleRequest,
} from "@/lib/analytics/events";
import { resetConsentModeForTests } from "@/lib/analytics/consent-mode";
import type { Product, ProductVariant } from "@/lib/schemas/product";

/**
 * A real catalogue shape, at a real price point. 19 600 UAH is the figure from
 * the brief's own example of why a single "Купити" button is wrong for these
 * goods — the value of one enquiry here is the whole reason the `value`
 * parameter has to be right.
 */
const base: ProductVariant = {
  sku: "Odri",
  colorLabel: "Сірий базовий",
  price: 19600,
  photo: "/odri.jpg",
  description: "",
};

const customColour: ProductVariant = {
  sku: "Odri color",
  colorLabel: "Свій колір",
  price: 23400,
  photo: "/odri-color.jpg",
  description: "",
  contactRequired: true,
};

const product: Product = {
  slug: "odri",
  sku: "Odri",
  name: "Раковина Odri",
  sourceCategory: "Раковини/Підлогові",
  shopCategory: "sinks",
  specEntries: [],
  base,
  customColour,
};

/** Only the app's own named events — gtag commands are consent-mode's tests. */
function events(): Record<string, unknown>[] {
  return (window.dataLayer ?? []).filter(
    (entry): entry is Record<string, unknown> =>
      Object.prototype.toString.call(entry) === "[object Object]",
  );
}

function lastEvent(): Record<string, unknown> {
  const all = events();
  return all[all.length - 1];
}

describe("analytics events", () => {
  beforeEach(() => {
    delete window.dataLayer;
    resetConsentModeForTests();
    resetEventsForTests();
  });

  afterEach(() => {
    vi.unstubAllEnvs();
  });

  describe("line items", () => {
    it("identifies the variant, not the parent product", () => {
      // "Odri" and "Odri color" are different goods at different prices.
      // Collapsing them onto the product SKU would report every custom-colour
      // order at the base price.
      expect(itemFor(product, customColour)).toEqual({
        item_id: "Odri color",
        item_name: "Раковина Odri",
        item_category: "sinks",
        item_variant: "Свій колір",
        price: 23400,
        quantity: 1,
      });
    });

    it("omits item_variant entirely for a product with no colour", () => {
      const plain: ProductVariant = { ...base, colorLabel: undefined };
      expect(itemFor(product, plain)).not.toHaveProperty("item_variant");
    });
  });

  describe("a lead that names a product is worth that product's price", () => {
    it("quote_request carries the selected variant's real price", () => {
      trackQuoteRequest(product, customColour);
      expect(lastEvent()).toMatchObject({
        event: "quote_request",
        value: 23400,
        currency: "UAH",
      });
    });

    it("reads the price from the variant in hand, not the product default", () => {
      // The visitor configured a custom colour; measuring the base price would
      // under-report the goal Ads is bidding toward by 3 800 UAH a lead.
      trackQuoteRequest(product, base);
      expect(lastEvent().value).toBe(19600);
      trackQuoteRequest(product, customColour);
      expect(lastEvent().value).toBe(23400);
    });

    it("sample_request from a product page uses that product's price", () => {
      trackSampleRequest({ location: "product", product, variant: base });
      expect(lastEvent()).toMatchObject({ event: "sample_request", value: 19600 });
    });
  });

  describe("a lead with no product behind it waits for the owner's figure", () => {
    it("ships without a value while NEXT_PUBLIC_LEAD_VALUE_UAH is unset", () => {
      // Deliberate. There is no defensible default — the right number is
      // average order value times close rate, and both are facts only the
      // owner has. An invented figure would be indistinguishable from a real
      // one in the Ads UI and would skew bidding toward whichever lead type
      // was over-valued.
      vi.stubEnv("NEXT_PUBLIC_LEAD_VALUE_UAH", "");
      trackDesignerInquiry({ location: "designers" });
      expect(lastEvent()).toEqual({
        event: "designer_inquiry",
        location: "designers",
      });
    });

    it("carries the figure once it is supplied", () => {
      vi.stubEnv("NEXT_PUBLIC_LEAD_VALUE_UAH", "4200");
      trackDesignerInquiry({ location: "designers" });
      expect(lastEvent()).toMatchObject({ value: 4200, currency: "UAH" });
    });

    it("refuses a zero or unparseable figure rather than reporting it", () => {
      // Zero and NaN both read as "this lead was worth nothing" to a
      // value-based bidding strategy, and the brief forbids a zero value.
      //
      // `undefined` rather than an absent key: `pushEvent` clears every
      // parameter an event does not set, and a key set to `undefined` is
      // dropped from the outgoing hit entirely. Absent and `undefined` are the
      // same thing to GTM; what matters is that no number reaches the bidder.
      for (const bad of ["0", "-100", "не число"]) {
        vi.stubEnv("NEXT_PUBLIC_LEAD_VALUE_UAH", bad);
        delete window.dataLayer;
        trackContactSubmit({ location: "contact" });
        expect(lastEvent().value, `value ${bad}`).toBeUndefined();
      }
    });

    it("covers every product-less lead the brief names", () => {
      vi.stubEnv("NEXT_PUBLIC_LEAD_VALUE_UAH", "4200");
      trackContactSubmit({ location: "contact" });
      trackPhoneClick({ location: "header" });
      trackMessengerClick({ channel: "viber", location: "footer" });
      trackSampleRequest({ location: "colours" });
      for (const event of events()) {
        expect(event.value, String(event.event)).toBe(4200);
      }
    });
  });

  describe("event names match the brief exactly", () => {
    it("fires the seven names the measurement plan is written against", () => {
      vi.stubEnv("NEXT_PUBLIC_LEAD_VALUE_UAH", "4200");
      trackQuoteRequest(product, base);
      trackDesignerInquiry({ location: "designers" });
      trackContactSubmit({ location: "contact" });
      trackMessengerClick({ channel: "telegram", location: "product" });
      trackPhoneClick({ location: "header" });
      trackSampleRequest({ location: "colours" });
      trackAddToCart(product, base);
      expect(events().map((event) => event.event)).toEqual([
        "quote_request",
        "designer_inquiry",
        "contact_submit",
        "messenger_click",
        "phone_click",
        "sample_request",
        "add_to_cart",
      ]);
    });
  });

  describe("ecommerce", () => {
    it("multiplies the price by quantity for add_to_cart", () => {
      trackAddToCart(product, base, 3);
      expect(lastEvent()).toMatchObject({ value: 58800, currency: "UAH" });
      expect(lastEvent().items).toEqual([{ ...itemFor(product, base), quantity: 3 }]);
    });

    it("carries a transaction_id on purchase so reloads cannot double-count", () => {
      // GA4 and Ads both deduplicate on it. Without one, a shopper refreshing
      // the order-status page books a second sale every time.
      trackPurchase({
        transactionId: "ORD-1042",
        items: [itemFor(product, base)],
        value: 19600,
      });
      expect(lastEvent()).toMatchObject({
        event: "purchase",
        transaction_id: "ORD-1042",
        value: 19600,
        currency: "UAH",
      });
    });

    it("passes the cart's own total through begin_checkout", () => {
      trackBeginCheckout({
        items: [itemFor(product, base), itemFor(product, customColour, 2)],
        value: 66400,
      });
      expect(lastEvent()).toMatchObject({ event: "begin_checkout", value: 66400 });
      expect((lastEvent().items as unknown[]).length).toBe(2);
    });
  });

  describe("enhanced conversions", () => {
    // Hashes as they arrive from `hashUserData` — that module's own test is
    // what checks they are the digests Google will compute. Here the question
    // is only whether they reach the event, under the key the tag reads.
    const userData = {
      sha256_email_address: "a".repeat(64),
      sha256_phone_number: "b".repeat(64),
    };

    it("nests the hashes under `user_data` on both main goals", () => {
      trackQuoteRequest(product, customColour, { userData });
      expect(lastEvent()).toMatchObject({
        event: "quote_request",
        user_data: userData,
      });

      trackDesignerInquiry({ location: "designers_page", userData });
      expect(lastEvent()).toMatchObject({
        event: "designer_inquiry",
        user_data: userData,
      });
    });

    it("carries them on the supporting goals too", () => {
      trackContactSubmit({ location: "contact_page", userData });
      expect(lastEvent()).toMatchObject({ user_data: userData });

      trackSampleRequest({ location: "colours_page", userData });
      expect(lastEvent()).toMatchObject({ user_data: userData });
    });

    it("does not displace the value or the qualification answers", () => {
      // `user_data` is one more key on the same event that Google Ads bids on.
      // Knocking out `value` here would be a silent downgrade from value-based
      // bidding to plain conversion counting.
      trackQuoteRequest(product, customColour, {
        projectType: "commercial",
        timeline: "now",
        userData,
      });
      expect(lastEvent()).toMatchObject({
        value: 23400,
        currency: "UAH",
        projectType: "commercial",
        timeline: "now",
        user_data: userData,
      });
    });

    it("sends no user_data at all when nothing could be hashed", () => {
      // Not `user_data: {}`. An empty object is a value the tag would read as
      // "we tried and got nothing", and it is indistinguishable in the UI from
      // a hashing bug affecting every visitor. `undefined` is dropped from the
      // hit; an empty object would not be.
      trackDesignerInquiry({ location: "designers_page", userData: {} });
      expect(lastEvent().user_data).toBeUndefined();

      trackQuoteRequest(product, base);
      expect(lastEvent().user_data).toBeUndefined();
    });

    it("never puts a raw `userData` key on the event", () => {
      // The parameter is named `userData` in TypeScript and `user_data` on the
      // wire. Leaking the camelCase one would ship a second copy of the same
      // payload under a key no tag reads.
      trackDesignerInquiry({ location: "designers_page", userData });
      expect(lastEvent()).not.toHaveProperty("userData");
    });
  });

  describe("consent ordering", () => {
    it("queues the denied defaults ahead of the very first event", () => {
      // Every event routes through `ensureConsentDefaults`, which is what makes
      // an out-of-order push structurally impossible rather than merely
      // unlikely — GTM reads the queue from index 0.
      trackPhoneClick({ location: "header" });
      const [first] = window.dataLayer ?? [];
      expect(Array.from(first as IArguments).slice(0, 2)).toEqual([
        "consent",
        "default",
      ]);
    });
  });
});
