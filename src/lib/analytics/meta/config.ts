import "server-only";

/**
 * Meta's half of the measurement setup: the dataset (pixel) ID and the
 * Conversions API credentials.
 *
 * ## Why this is a separate module from `analytics/config.ts`
 *
 * That file is imported by client components — it is where `NEXT_PUBLIC_GTM_ID`
 * lives, and Next inlines those values into the JavaScript bundle. This file
 * holds an access token that grants write access to the ad account's event
 * data. The two must not be able to end up in the same import graph by
 * accident, so this one opens with `server-only`: importing it from a Client
 * Component is a build error rather than a leaked secret.
 *
 * ## Why there is no `NEXT_PUBLIC_META_PIXEL_ID`
 *
 * There is no browser-side Meta configuration in this codebase at all. The
 * pixel is a tag inside the GTM container, configured in the GTM UI against the
 * events in `analytics/events.ts` — the same arrangement GA4 and Google Ads
 * already use, and for the same reason: one loader, one place a conversion can
 * be double-counted, no deploy for a measurement change. The pixel ID below is
 * needed *only* because the Conversions API endpoint is addressed by dataset
 * ID.
 *
 * Every value is optional and unset means off. A CAPI call with a missing token
 * does not fail loudly at Meta — it 400s into a `catch` nobody reads, so the
 * check has to happen here, before the request, where it can say so in
 * development.
 */

function trimmed(value: string | undefined): string | undefined {
  const trimmedValue = value?.trim();
  return trimmedValue ? trimmedValue : undefined;
}

/**
 * The dataset ID, which Meta still calls a pixel ID in most of the UI. A long
 * run of digits — `582014448861090` is the existing one for odudlab.com.
 *
 * Shape-checked for the same reason `gtmContainerId` is: a value pasted with a
 * stray character produces a URL that 404s at Graph, which surfaces as "no
 * server events" three weeks later rather than as an error now.
 */
const PIXEL_ID_PATTERN = /^\d{8,20}$/;

export function metaPixelId(): string | undefined {
  const id = trimmed(process.env.META_PIXEL_ID);
  if (!id) return undefined;
  if (!PIXEL_ID_PATTERN.test(id)) {
    if (process.env.NODE_ENV === "development") {
      console.warn(
        "[meta] META_PIXEL_ID is not a dataset ID (expected digits only). " +
          "No server events will be sent.",
      );
    }
    return undefined;
  }
  return id;
}

/**
 * The Conversions API access token.
 *
 * Never `NEXT_PUBLIC_`, never committed, and deliberately never interpolated
 * into a log line or a URL anywhere in this codebase — see
 * `conversions-api.ts`, which puts it in the POST body rather than the query
 * string precisely because URLs get written to access logs by every proxy they
 * pass through.
 *
 * The value is returned raw and is never echoed: the warning below names the
 * variable, not its contents.
 */
export function metaCapiAccessToken(): string | undefined {
  return trimmed(process.env.META_CAPI_ACCESS_TOKEN);
}

/**
 * Routes server events to the Test Events tab in Events Manager instead of into
 * the live dataset.
 *
 * Set it while verifying the setup, unset it afterwards. Left on in production
 * it does not break anything visibly — events keep flowing, they just stop
 * counting as conversions, which is the kind of failure that is only noticed
 * once a campaign has been optimising against nothing for a fortnight. Hence
 * the loud warning.
 */
export function metaCapiTestEventCode(): string | undefined {
  const code = trimmed(process.env.META_CAPI_TEST_EVENT_CODE);
  if (code && process.env.VERCEL_ENV === "production") {
    console.warn(
      "[meta] META_CAPI_TEST_EVENT_CODE is set in production — server events " +
        "are going to Test Events and will NOT be counted as conversions.",
    );
  }
  return code;
}

/**
 * Graph API version, pinned.
 *
 * Meta versions this endpoint and retires each version roughly two years after
 * release; an unversioned call silently follows whatever is current, which
 * means the payload contract can change under a deployment that was not
 * touched. Pinning makes the upgrade a decision.
 *
 * `META_GRAPH_API_VERSION` overrides it. That override exists because the
 * default below is only as current as the day this was written: when Meta
 * deprecates it, the fix is an env var and a redeploy, not a code change
 * waiting on whoever is available to write one.
 */
export const DEFAULT_GRAPH_API_VERSION = "v23.0";

export function metaGraphApiVersion(): string {
  return trimmed(process.env.META_GRAPH_API_VERSION) ?? DEFAULT_GRAPH_API_VERSION;
}

/**
 * Whether the Conversions API is configured at all.
 *
 * Both halves are required — a dataset ID with no token, or a token with no
 * dataset, is a half-finished setup rather than a deliberate "off".
 */
export function isMetaCapiConfigured(): boolean {
  return Boolean(metaPixelId() && metaCapiAccessToken());
}
