import { pushEvent, type DataLayerEvent } from "@/lib/analytics/data-layer";
import { ensureConsentDefaults } from "@/lib/analytics/consent-mode";
import { CURRENCY, leadValue } from "@/lib/analytics/config";
import type { HashedUserData } from "@/lib/analytics/user-data";
import type { Product, ProductVariant } from "@/lib/schemas/product";

/**
 * The measurement plan, as code.
 *
 * These are the events the brief names, and no others. Every one is a function
 * with a typed signature rather than a free-form `push`, because the failure
 * mode of a dataLayer is that it accepts anything: a mistyped `quote_reqest`,
 * a `value` that arrives as the string `"19600"`, an event fired from a second
 * place with a slightly different parameter name. None of that errors. It
 * produces a conversion column that looks populated and is wrong, and the
 * campaign optimising against it spends real money on the difference. A
 * function that will not compile with the wrong shape is the cheapest possible
 * guard against that.
 *
 * ## About `value`
 *
 * Google Ads cannot bid toward value without one, so every event carries it —
 * and the brief is explicit that it must never be zero. Where it comes from
 * splits cleanly in two:
 *
 *   - **A lead that names a product** — a quote request from a product page, a
 *     colour sample for a specific model — is worth that product's real price,
 *     read from the variant the visitor actually had selected. Nothing is
 *     estimated.
 *   - **A lead with no product behind it** — a designer enquiry, a contact
 *     message, a phone tap — is worth a single figure the owner supplies via
 *     `NEXT_PUBLIC_LEAD_VALUE_UAH`. See `config.ts` for why there is no
 *     default and what happens while it is unset.
 *
 * These are premium made-to-order goods with a decision cycle measured in
 * weeks, so `value` here is the value of the *enquiry*, not of a sale. That is
 * the correct input for a lead-generation campaign and it is why the numbers
 * in Ads will not reconcile with revenue — they are not supposed to.
 */

/** One line item, in the shape GA4's ecommerce events expect. */
export type AnalyticsItem = {
  item_id: string;
  item_name: string;
  /**
   * Optional only because the cart genuinely does not know it.
   *
   * `itemFor` below always supplies it — a product page has the whole
   * catalogue object in hand. A cart line does not: `/api/cart` returns a
   * display view (name, SKU, price, quantity) built for rendering the cart,
   * with no category on it. Widening the API to carry one just to fill this
   * field would be inventing a requirement; GA4 treats `item_category` as
   * optional, and `item_id` is what both it and Ads actually join on.
   */
  item_category?: string;
  item_variant?: string;
  price: number;
  quantity: number;
};

/**
 * Build a line item from the real catalogue objects.
 *
 * `item_id` is the **variant** SKU, not the product's. The variant is the
 * thing that has a price and is the thing that ships — "Odri" and "Odri color"
 * are different goods at different prices, and collapsing them onto the parent
 * SKU would make every custom-colour order report the base price.
 */
export function itemFor(
  product: Product,
  variant: ProductVariant,
  quantity = 1,
): AnalyticsItem {
  return {
    item_id: variant.sku,
    item_name: product.name,
    item_category: product.shopCategory,
    ...(variant.colorLabel ? { item_variant: variant.colorLabel } : {}),
    price: variant.price,
    quantity,
  };
}

/**
 * Build a line item from a cart line.
 *
 * The cart's own numbers, not the catalogue's. `currentPrice` is what the
 * server just recomputed and what the customer is about to be charged;
 * `unitPrice` is what the line was created at. They differ exactly when the
 * price changed while the item sat in the cart — `priceChanged` is how the
 * cart page flags that — and measuring the stale one would report a checkout
 * total that disagrees with the order in the admin panel.
 */
export function itemForCartLine(line: {
  productName: string;
  variantSku: string;
  variantLabel?: string;
  quantity: number;
  unitPrice: number;
  currentPrice: number | null;
}): AnalyticsItem {
  return {
    item_id: line.variantSku,
    item_name: line.productName,
    ...(line.variantLabel ? { item_variant: line.variantLabel } : {}),
    price: line.currentPrice ?? line.unitPrice,
    quantity: line.quantity,
  };
}

/**
 * Warn once, in development only, when a lead is measured without a value.
 *
 * The event still fires — a conversion counted without a value is far better
 * than one not counted at all — but the gap is worth saying out loud, because
 * it is invisible from the Ads UI: the conversion appears, its value column
 * reads zero, and it looks like a setting rather than a missing figure.
 */
let warnedAboutLeadValue = false;
function leadMonetary(): { value: number; currency: string } | Record<never, never> {
  const value = leadValue();
  if (value !== undefined) return { value, currency: CURRENCY };
  if (process.env.NODE_ENV === "development" && !warnedAboutLeadValue) {
    warnedAboutLeadValue = true;
    console.warn(
      "[analytics] NEXT_PUBLIC_LEAD_VALUE_UAH is not set, so lead events " +
        "ship without a `value`. Google Ads can count these conversions but " +
        "cannot bid toward their value until the owner supplies the figure.",
    );
  }
  return {};
}

/**
 * Single funnel for everything below.
 *
 * `ensureConsentDefaults` runs first on every path, which is what guarantees
 * the denied Consent Mode defaults sit at index 0 of the queue no matter which
 * of these fires first or how early — see the long note in `consent-mode.ts`.
 */
function track(event: DataLayerEvent): boolean {
  ensureConsentDefaults();
  return pushEvent(event);
}

/* -------------------------------------------------------------------------
 * Primary goals
 * ---------------------------------------------------------------------- */

/**
 * The two qualification answers, when the visitor gave them.
 *
 * Carried on both main goals as event parameters so the campaign can be judged
 * by *what kind* of enquiry it produced, not just how many. That distinction is
 * the whole brief: a hundred `exploring` leads and ten `now` leads from a
 * commercial project are the same number in a cost-per-lead report and nothing
 * alike in the workshop.
 *
 * Both keys are absent rather than empty when unanswered — an empty string
 * would become a real-looking segment in GA4. See `qualificationBody`.
 */
export type LeadQualification = {
  projectType?: string;
  timeline?: string;
};

/**
 * Hashed contact details for Enhanced Conversions, when the browser could
 * produce them. See `user-data.ts` for what is hashed and why.
 *
 * Nested under `user_data` rather than spread flat like the qualification
 * answers, because that is the key the Google Ads tag reads. Keeping it on the
 * conversion event itself — rather than as a separate earlier push — means
 * there is no window in which the tag can fire before the hashes have arrived.
 */
export type LeadIdentity = {
  userData?: HashedUserData;
};

/** Omit the key entirely when there was nothing to hash. */
function identity({ userData }: LeadIdentity): Record<string, unknown> {
  if (!userData || Object.keys(userData).length === 0) return {};
  return { user_data: userData };
}

/**
 * "Отримати прорахунок" — the main goal. Always raised from a product page, so
 * it always carries that product's real price.
 */
export function trackQuoteRequest(
  product: Product,
  variant: ProductVariant,
  params: LeadQualification & LeadIdentity = {},
): boolean {
  const { userData, ...qualification } = params;
  return track({
    event: "quote_request",
    value: variant.price,
    currency: CURRENCY,
    items: [itemFor(product, variant)],
    ...qualification,
    ...identity({ userData }),
  });
}

/**
 * The architect/designer enquiry — the other main goal, and commercially the
 * most valuable thing on the site: one designer specifying the product carries
 * a project's worth of units, not one. It has no product behind it by nature,
 * so it takes the owner-supplied lead value.
 */
export function trackDesignerInquiry(
  params: {
    /** Which page the form was on, so the two goals can be told apart in GA4. */
    location: string;
  } & LeadQualification &
    LeadIdentity,
): boolean {
  const { userData, ...rest } = params;
  return track({
    event: "designer_inquiry",
    ...rest,
    ...leadMonetary(),
    ...identity({ userData }),
  });
}

/* -------------------------------------------------------------------------
 * Supporting goals
 * ---------------------------------------------------------------------- */

/** General contact form. */
export function trackContactSubmit(
  params: { location: string } & LeadIdentity,
): boolean {
  return track({
    event: "contact_submit",
    location: params.location,
    ...leadMonetary(),
    ...identity(params),
  });
}

/**
 * A colour-sample request. Optionally tied to a product — a sample asked for
 * from a product page is a much warmer signal than one asked for from the
 * colours page, and the value reflects that difference honestly rather than
 * flattening both to the same number.
 */
export function trackSampleRequest(
  params: {
    location: string;
    product?: Product;
    variant?: ProductVariant;
  } & LeadIdentity,
): boolean {
  const { product, variant } = params;
  const monetary =
    product && variant
      ? {
          value: variant.price,
          currency: CURRENCY,
          items: [itemFor(product, variant)],
        }
      : leadMonetary();
  return track({
    event: "sample_request",
    location: params.location,
    ...monetary,
    ...identity(params),
  });
}

/** A tap on a `tel:` link. Secondary — a call intent, not a call. */
export function trackPhoneClick(params: { location: string }): boolean {
  return track({
    event: "phone_click",
    location: params.location,
    ...leadMonetary(),
  });
}

/** Viber / Telegram / any other chat handoff. */
export function trackMessengerClick(params: {
  channel: "viber" | "telegram";
  location: string;
}): boolean {
  return track({
    event: "messenger_click",
    channel: params.channel,
    location: params.location,
    ...leadMonetary(),
  });
}

/* -------------------------------------------------------------------------
 * Ecommerce
 * ---------------------------------------------------------------------- */

export function trackAddToCart(
  product: Product,
  variant: ProductVariant,
  quantity = 1,
): boolean {
  return track({
    event: "add_to_cart",
    value: variant.price * quantity,
    currency: CURRENCY,
    items: [itemFor(product, variant, quantity)],
  });
}

export function trackBeginCheckout(params: {
  items: AnalyticsItem[];
  value: number;
}): boolean {
  return track({
    event: "begin_checkout",
    value: params.value,
    currency: CURRENCY,
    items: params.items,
  });
}

/**
 * A completed order. `transaction_id` is required, not optional: GA4 and Ads
 * both deduplicate on it, and without one a shopper who reloads the
 * order-status page books a second purchase every time.
 */
export function trackPurchase(params: {
  transactionId: string;
  items: AnalyticsItem[];
  value: number;
}): boolean {
  return track({
    event: "purchase",
    transaction_id: params.transactionId,
    value: params.value,
    currency: CURRENCY,
    items: params.items,
  });
}

/** Test seam — the one-time dev warning has to be resettable between cases. */
export function resetEventsForTests(): void {
  warnedAboutLeadValue = false;
}
