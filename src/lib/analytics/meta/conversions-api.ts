import "server-only";
import {
  isMetaCapiConfigured,
  metaCapiAccessToken,
  metaCapiTestEventCode,
  metaGraphApiVersion,
  metaPixelId,
} from "@/lib/analytics/meta/config";
import type { MetaUserData } from "@/lib/analytics/meta/user-data";

/**
 * The Conversions API transport: one POST to Graph, and the rules about what
 * must never appear in it.
 *
 * ## Why a server copy of an event the browser already sent
 *
 * Because the browser increasingly does not send it. Ad blockers, Safari's ITP
 * and a declined consent banner each remove the pixel event, and they do not
 * remove it evenly — they remove it hardest from exactly the visitors most
 * likely to refuse tracking. The result is not a flat undercount that a bidding
 * strategy could learn around; it is a biased sample. The server request leaves
 * from our own infrastructure and is not subject to any of that.
 *
 * The price of sending both is that Meta now sees two of everything, which is
 * what `event_id` is for. See `dedupe` below.
 *
 * ## What never leaves this module
 *
 * - **The access token is in the POST body, not the query string.** Graph
 *   accepts `?access_token=…` and every proxy, CDN and platform access log in
 *   the path would then have a write credential in plaintext, retained for
 *   whatever that log's retention period happens to be.
 * - **Nothing is logged that could contain it.** The error path scrubs the
 *   token out of anything it prints, on the assumption that some future Graph
 *   error message will helpfully echo the request back.
 * - **No plaintext personal data.** `user_data` arrives already hashed from
 *   `buildMetaUserData`; this module never sees an address or a phone number.
 */

/**
 * The Meta standard events this codebase sends server-side.
 *
 * Only `Lead` today: it is the one event with a server-side origin — a row
 * committed to the leads table — and therefore the one whose server copy is
 * strictly more trustworthy than the browser's. `Purchase` will belong here
 * too once checkout is confirmed server-side; `Contact`, `AddToCart` and
 * `InitiateCheckout` are browser-only intent signals with no server event to
 * copy, so they stay pixel-only.
 */
export type MetaEventName = "Lead" | "Purchase";

export type MetaServerEvent = {
  eventName: MetaEventName;
  /**
   * The deduplication key. Minted in the browser and sent to both the pixel and
   * this endpoint — see `useLeadForm`. Without it Meta counts the same lead
   * twice and every campaign optimising toward leads learns from a number that
   * is exactly double the truth.
   */
  eventId: string;
  /** Unix seconds. Meta rejects events older than seven days. */
  eventTime?: number;
  /** The page the visitor submitted from. */
  eventSourceUrl?: string;
  userData: MetaUserData;
  /**
   * Which form this was — `"contact"`, `"quote"`, `"designer"`, `"sample"`.
   * Sent as `content_name` so Events Manager can tell them apart; the four are
   * all `Lead` because that is what Meta's optimisation understands, but they
   * are not equally valuable and the breakdown is the only way to see that.
   */
  contentName?: string;
  /** Only when a real figure exists — never a placeholder. See `leadValue()`. */
  value?: number;
  currency?: string;
};

/**
 * `"sent"` when Graph accepted it, `"skipped"` when the API is not configured,
 * `"failed"` otherwise. Returned rather than thrown because every caller is
 * inside `after()`, where a rejection is an unhandled one — and because the
 * tests need to assert that an unconfigured deployment stays quiet instead of
 * erroring.
 */
export type MetaSendResult = "sent" | "skipped" | "failed";

/** Graph can be slow; the visitor's response has already been sent, but a
 * request with no ceiling keeps a serverless invocation alive at our expense. */
const REQUEST_TIMEOUT_MS = 5000;

/** Never print the token, whatever Graph decides to echo back at us. */
function scrub(text: string, token: string | undefined): string {
  return token ? text.split(token).join("[redacted]") : text;
}

export async function sendMetaServerEvent(
  event: MetaServerEvent,
): Promise<MetaSendResult> {
  const pixelId = metaPixelId();
  const accessToken = metaCapiAccessToken();
  if (!pixelId || !accessToken) {
    if (process.env.NODE_ENV === "development" && !isMetaCapiConfigured()) {
      console.info(
        "[meta] Conversions API is not configured (META_PIXEL_ID / " +
          "META_CAPI_ACCESS_TOKEN unset) — no server event sent.",
      );
    }
    return "skipped";
  }

  const testEventCode = metaCapiTestEventCode();
  const url = `https://graph.facebook.com/${metaGraphApiVersion()}/${pixelId}/events`;

  const body = {
    data: [
      {
        event_name: event.eventName,
        // Meta matches the server event to the browser one on
        // `event_name` + `event_id`, so both must be identical. `event_time`
        // may differ by up to a few minutes without breaking the match.
        event_id: event.eventId,
        event_time: event.eventTime ?? Math.floor(Date.now() / 1000),
        // "website" and not "system_generated": the visitor really did submit a
        // form in a browser. This one is load-bearing — it is how Meta decides
        // whether the event is eligible for attribution at all.
        action_source: "website",
        ...(event.eventSourceUrl
          ? { event_source_url: event.eventSourceUrl }
          : {}),
        user_data: event.userData,
        ...(event.contentName || event.value !== undefined
          ? {
              custom_data: {
                ...(event.contentName
                  ? { content_name: event.contentName }
                  : {}),
                // Absent unless a real value exists. A placeholder here would
                // look identical to a measured figure in the Ads UI and Smart
                // Bidding would spend against it.
                ...(event.value !== undefined
                  ? { value: event.value, currency: event.currency }
                  : {}),
              },
            }
          : {}),
      },
    ],
    access_token: accessToken,
    ...(testEventCode ? { test_event_code: testEventCode } : {}),
  };

  try {
    const response = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
      signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS),
      // Never cached, never revalidated — this is a write.
      cache: "no-store",
    });

    if (!response.ok) {
      const detail = await response.text().catch(() => "");
      console.error(
        `[meta] Conversions API rejected ${event.eventName}: ` +
          `${response.status} ${scrub(detail, accessToken).slice(0, 500)}`,
      );
      return "failed";
    }
    return "sent";
  } catch (error) {
    // Includes the timeout. The lead is already saved and the customer already
    // has their confirmation; a missed server event costs attribution quality,
    // nothing else.
    console.error(
      `[meta] Conversions API request failed for ${event.eventName}: ` +
        scrub(String(error), accessToken),
    );
    return "failed";
  }
}
