/**
 * Every number and ID the measurement setup depends on, in one place, read
 * from the environment.
 *
 * Nothing here has a hardcoded fallback, and that is the point. A wrong
 * container ID or an invented conversion value does not fail — it reports,
 * confidently, into the wrong account or with a made-up figure, and the
 * campaign that gets optimised against it spends real money on the strength of
 * it. Unset means off, loudly, and every consumer below is written to cope
 * with off.
 */

/**
 * `process.env` on the client is not an object — Next inlines each
 * `process.env.NEXT_PUBLIC_*` reference at build time by textual
 * substitution, so `process.env[name]` reads nothing and destructuring reads
 * nothing. Every access below has to be the full literal expression, which is
 * why these are separate functions rather than a loop over a list of names.
 */
function trimmed(value: string | undefined): string | undefined {
  const trimmedValue = value?.trim();
  return trimmedValue ? trimmedValue : undefined;
}

/**
 * GTM container. The *only* vendor ID this codebase knows.
 *
 * GA4, Google Ads and the Meta pixel are deliberately absent: they are tags
 * inside this container, configured in the GTM UI against the events in
 * `events.ts`. Hard-coding a second loader for each of them would mean two
 * places that can double-count the same conversion and a deploy for every
 * measurement change.
 *
 * The shape is checked because the value is interpolated into an inline
 * `<script>`. Nothing untrusted can reach it — it is a build-time env var —
 * but "nothing untrusted can reach it" is a claim about today's build
 * pipeline, and a five-character regex outlives that claim. A malformed ID
 * also fails silently otherwise: GTM serves a 404 and the site simply stops
 * measuring.
 */
const GTM_ID_PATTERN = /^GTM-[A-Z0-9]+$/;

export function gtmContainerId(): string | undefined {
  const id = trimmed(process.env.NEXT_PUBLIC_GTM_ID);
  if (!id) return undefined;
  if (!GTM_ID_PATTERN.test(id)) {
    if (process.env.NODE_ENV === "development") {
      console.warn(
        `[analytics] NEXT_PUBLIC_GTM_ID=${JSON.stringify(id)} is not a GTM ` +
          `container ID (expected GTM-XXXXXXX). No container will load.`,
      );
    }
    return undefined;
  }
  return id;
}

/** The store sells in one currency; every monetary event says so explicitly. */
export const CURRENCY = "UAH";

/**
 * What one lead is worth, in UAH, when it is not attached to a product.
 *
 * Google Ads needs a value per conversion or it cannot bid toward value. Where
 * a lead names a product — a quote request from a product page, a colour
 * sample for a specific model — the value is that product's real price and
 * this is not consulted. What it covers is the rest: a designer enquiry, a
 * contact-form message, a sample request with no model chosen.
 *
 * **Owner input required.** There is no defensible default: the right number
 * is the average order value times the close rate, and both are facts about
 * this business that only the owner has. A guess here would look exactly like
 * a real figure in the Ads UI and would quietly skew bidding toward whichever
 * lead type was over-valued. So while it is unset, lead events ship without a
 * `value` — measurable as counts, not yet biddable by value — and
 * `assertLeadValueConfigured` says so in development.
 */
export function leadValue(): number | undefined {
  const raw = trimmed(process.env.NEXT_PUBLIC_LEAD_VALUE_UAH);
  if (!raw) return undefined;
  const parsed = Number(raw);
  // A typo'd value is worse than none: `NaN` and `0` both mean "this lead was
  // worth nothing" to a value-based bidding strategy, and the brief is
  // explicit that no event may carry a zero value.
  return Number.isFinite(parsed) && parsed > 0 ? parsed : undefined;
}
