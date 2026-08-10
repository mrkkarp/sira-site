import "server-only";
import { after } from "next/server";
import { CURRENCY, leadValue } from "@/lib/analytics/config";
import {
  sendMetaServerEvent,
  type MetaSendResult,
} from "@/lib/analytics/meta/conversions-api";
import {
  buildMetaUserData,
  type MetaUserData,
} from "@/lib/analytics/meta/user-data";
import { getProductRepository } from "@/repositories/product-repository";
import { moneyToDecimal } from "@/domain/shared/money-units";

/**
 * One lead, as a Meta server event.
 *
 * This is the layer that knows about HTTP: it pulls the match signals Meta
 * wants out of the incoming request — the click cookies, the IP, the user
 * agent, the page the form was on — and hands the rest to
 * `buildMetaUserData`/`sendMetaServerEvent`, neither of which knows what a
 * request is.
 *
 * Callers run it inside `after()` so none of this is on the customer's critical
 * path. See `lead-endpoint.ts`.
 */

/** The two cookies the pixel drops, and the only reason to read cookies here.
 *
 * `_fbc` is the click ID: the pixel writes it when the visitor arrives with
 * `?fbclid=…` on the URL, i.e. from an actual Meta ad. It is by a wide margin
 * the strongest match signal there is — an exact join back to one click — and
 * it is the difference between "this lead came from somewhere" and "this lead
 * came from that ad". `_fbp` is the browser ID, which matches the same visitor
 * across sessions on this site.
 *
 * Both are sent unhashed. Meta rejects them hashed; they are its own
 * identifiers, not the customer's personal data. */
const FBC_COOKIE = "_fbc";
const FBP_COOKIE = "_fbp";

export type MetaLeadInput = {
  /** Which form — becomes `content_name`, so the four lead types can be told
   *  apart in Events Manager even though all four are the `Lead` event. */
  form: string;
  /**
   * The deduplication key, minted in the browser and sent to the pixel and to
   * this endpoint in the same submission.
   *
   * Optional in the type only because the request body is untrusted input. When
   * it is missing nothing is sent — see `reportLeadToMeta`.
   */
  eventId?: string;
  name?: string;
  email?: string;
  phone?: string;
  /**
   * Which product the visitor had selected, when the form knew of one.
   *
   * Slug and SKU rather than repository ids, because that is what the forms
   * actually post: `/api/quote` receives `productId: product.slug` and
   * `variantId: variant.sku` (see `quote-request-form.tsx`), and the sample
   * form posts slugs too. Naming them for what they are here is the difference
   * between a lookup that works and one that silently finds nothing and prices
   * every quote at the flat lead value.
   */
  productSlug?: string;
  variantSku?: string;
};

/** First entry of `x-forwarded-for` — the client, before our proxies. */
function clientIp(headers: Headers): string | undefined {
  const forwarded = headers.get("x-forwarded-for");
  return forwarded?.split(",")[0]?.trim() || undefined;
}

/**
 * The page the form was submitted from.
 *
 * `Referer` rather than anything from the body, on the same reasoning as
 * `localeAndSourcePathFromReferer`: a client-supplied "which page was I on" is
 * forgeable, and this one ends up in an ad platform's reporting. Anything that
 * is not an http(s) URL is dropped rather than passed through.
 */
function eventSourceUrl(headers: Headers): string | undefined {
  const referer = headers.get("referer");
  if (!referer) return undefined;
  try {
    const url = new URL(referer);
    return url.protocol === "https:" || url.protocol === "http:"
      ? url.toString()
      : undefined;
  } catch {
    return undefined;
  }
}

/**
 * What this lead is worth, in UAH — and nothing invented.
 *
 * Two sources, in order:
 *
 *   1. **The product the visitor actually chose**, looked up server-side from
 *      the ids on the submission. Deliberately not taken from the request body:
 *      a price supplied by the client is a price an attacker can supply, and
 *      this number is fed to bidding.
 *   2. **`NEXT_PUBLIC_LEAD_VALUE_UAH`** for leads with no product behind them.
 *      Unset today, and no default will be invented — see `config.ts`.
 *
 * The lookup matters more than it looks. Meta deduplicates by keeping the
 * *first* copy of an `event_id` it receives, and the server copy usually wins
 * that race. If the browser sent a priced `Lead` and this one arrived valueless
 * a moment earlier, the price would be silently discarded — a valueless
 * conversion where a real figure existed all along.
 */
async function monetary(input: MetaLeadInput): Promise<{
  value?: number;
  currency?: string;
}> {
  if (input.productSlug && input.variantSku) {
    try {
      const products = await getProductRepository();
      const product = await products.findBySlug(input.productSlug);
      const variant = product?.variants.find(
        (candidate) => candidate.sku === input.variantSku,
      );
      if (variant?.price) {
        return {
          value: moneyToDecimal(variant.price),
          currency: variant.price.currency,
        };
      }
    } catch (error) {
      // A catalogue read failing must not cost us the conversion; fall through
      // to the flat lead value below.
      console.error("[meta] could not price lead from the catalogue", error);
    }
  }

  const flat = leadValue();
  return flat !== undefined ? { value: flat, currency: CURRENCY } : {};
}

/**
 * Send the server copy of a `Lead`.
 *
 * Returns rather than throws, and every failure inside is contained: by the
 * time this runs the lead is committed and the customer has their
 * confirmation. Nothing here is allowed to change that outcome.
 */
export async function reportLeadToMeta(
  request: Request,
  input: MetaLeadInput,
): Promise<MetaSendResult> {
  // No `event_id`, no send. The pixel has already reported this lead from the
  // browser; a server copy that cannot be matched to it would be counted as a
  // second, separate lead — and a conversion count that is quietly double the
  // truth is worse for bidding than one that is quietly incomplete. This is
  // also the correct behaviour for a visitor still running a cached bundle
  // from before `event_id` existed.
  if (!input.eventId) {
    if (process.env.NODE_ENV === "development") {
      console.warn(
        `[meta] ${input.form} lead had no event_id — server event skipped ` +
          "rather than risk counting the lead twice.",
      );
    }
    return "skipped";
  }

  const headers = request.headers;
  const hashed = await buildMetaUserData({
    name: input.name,
    email: input.email,
    phone: input.phone,
  });

  const cookies = parseCookies(headers.get("cookie"));
  const userData: MetaUserData = {
    ...hashed,
    ...(clientIp(headers) ? { client_ip_address: clientIp(headers) } : {}),
    ...(headers.get("user-agent")
      ? { client_user_agent: headers.get("user-agent") as string }
      : {}),
    ...(cookies[FBP_COOKIE] ? { fbp: cookies[FBP_COOKIE] } : {}),
    ...(cookies[FBC_COOKIE] ? { fbc: cookies[FBC_COOKIE] } : {}),
  };

  const { value, currency } = await monetary(input);

  return sendMetaServerEvent({
    eventName: "Lead",
    eventId: input.eventId,
    eventSourceUrl: eventSourceUrl(headers),
    contentName: input.form,
    userData,
    ...(value !== undefined ? { value, currency } : {}),
  });
}

/**
 * Schedule `reportLeadToMeta` to run once the response has been sent, and make
 * that scheduling itself unable to fail the request.
 *
 * Two layers, and both earn their place:
 *
 *   - **`after`** keeps Graph off the customer's critical path. The lead is
 *     already committed by the time this is called; making the confirmation
 *     wait on an ad platform — or fail because one timed out — would tell a
 *     customer their enquiry did not arrive when it did, and they resubmit or
 *     give up. On Vercel the callback is kept alive by `waitUntil`.
 *   - **The `try`** covers `after` itself throwing, which it does when there is
 *     no request scope to attach to. That is the same rule the staff
 *     notification follows a few lines up in `lead-endpoint.ts`: nothing
 *     downstream of a saved lead is allowed to turn it into a 500.
 *
 * Callers get one line and no way to get the ordering wrong.
 */
export function reportLeadToMetaAfterResponse(
  request: Request,
  input: MetaLeadInput,
): void {
  try {
    after(() => reportLeadToMeta(request, input));
  } catch (error) {
    console.error("[meta] could not schedule the server event", error);
  }
}

/**
 * Read the raw `Cookie` header rather than `NextRequest.cookies`, so this works
 * against a plain `Request` — which is what the tests hand it, and what a route
 * outside Next's own request type would have.
 */
function parseCookies(header: string | null): Record<string, string> {
  if (!header) return {};
  const out: Record<string, string> = {};
  for (const part of header.split(";")) {
    const index = part.indexOf("=");
    if (index < 1) continue;
    const name = part.slice(0, index).trim();
    const value = part.slice(index + 1).trim();
    if (name) out[name] = decodeURIComponent(value);
  }
  return out;
}
