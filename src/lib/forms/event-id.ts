/**
 * The deduplication key that lets Meta count one lead once.
 *
 * Every lead is reported to Meta twice, deliberately. The pixel reports it from
 * the browser, where the click cookies live and where attribution is strongest;
 * our server reports it again through the Conversions API, because the browser
 * copy is exactly what an ad blocker, Safari's ITP or a declined consent banner
 * removes — and removes unevenly, hitting hardest the visitors most likely to
 * refuse tracking, so what is left is not an undercount but a biased sample.
 *
 * Meta collapses the two copies back into one lead when they share an
 * `event_name` and an `event_id`, and counts them as two leads when they do
 * not. There is no warning for the second case. The conversion column simply
 * reads double, and a campaign optimising toward leads spends against a number
 * that is twice the truth.
 *
 * So the id is minted once, in the browser, at the moment of submission
 * (`useLeadForm`), and travels down both paths from there: in the POST body
 * under `EVENT_ID_FIELD`, and in the dataLayer push as `event_id`.
 *
 * This module is imported by both halves — a client hook and a server route
 * handler — which is the whole point. The field name is a contract between
 * them, and a contract written down in two places is a contract that drifts.
 * It stays free of `server-only` and of zod for that reason; see
 * `src/lib/client-bundle.test.ts` for what the latter would cost.
 */

/** The key this travels under in a form POST body. */
export const EVENT_ID_FIELD = "event_id";

/**
 * A fresh id.
 *
 * `crypto.randomUUID` where it exists — which is everywhere this code runs in
 * production, since it needs a secure context and the site is HTTPS. The
 * fallback is for the exceptions that are not worth failing over: a plain-http
 * origin in local development, and an older browser. Collisions there would
 * merely mean a lead deduplicated against a stranger's, and 128 bits of
 * `Math.random` spread across two segments makes that vanishingly unlikely
 * without pretending to be cryptographic.
 */
export function newEventId(): string {
  const uuid = globalThis.crypto?.randomUUID?.();
  if (uuid) return uuid;
  const random = () => Math.random().toString(36).slice(2, 12);
  return `${Date.now().toString(36)}-${random()}-${random()}`;
}

/**
 * Pull the id back out of an untrusted request body.
 *
 * Length-capped and character-restricted because this value is echoed into an
 * outbound request to Meta and into server logs, and "it is only ever our own
 * UUID" is a statement about the client we shipped, not about the client that
 * is actually posting. Anything that is not a plausible id is dropped, which
 * makes the server event fall back to not being sent at all — see
 * `reportLeadToMeta`, and note that this is the safe direction: an unsent
 * server event loses a little attribution, a mismatched one double-counts.
 */
const EVENT_ID_PATTERN = /^[A-Za-z0-9._-]{8,128}$/;

export function eventIdFromBody(body: unknown): string | undefined {
  if (typeof body !== "object" || body === null) return undefined;
  const value = (body as Record<string, unknown>)[EVENT_ID_FIELD];
  if (typeof value !== "string") return undefined;
  return EVENT_ID_PATTERN.test(value) ? value : undefined;
}
