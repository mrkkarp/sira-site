import { gtag } from "@/lib/analytics/data-layer";
import type { ConsentState } from "@/lib/cookie-consent";

/**
 * Google Consent Mode v2.
 *
 * This replaces, rather than extends, the previous design — the two cannot
 * coexist. The old GA adapter loaded no tag at all until the visitor accepted
 * cookies, which is a defensible reading of ePrivacy but means a declining
 * visitor is invisible: no pageview, no conversion, no modelling, and Google
 * Ads bidding blind on whatever share of traffic declines. Consent Mode is the
 * arrangement Google now requires for EEA ad traffic and it inverts that: the
 * tag loads immediately but *denied*, so it sets no cookies and stores no
 * identifiers, and sends cookieless pings that Google uses to model the
 * conversions it is not allowed to observe. Accepting is an `update` on a tag
 * that is already there, not a fresh load.
 *
 * The consequence worth stating plainly: with Consent Mode, a request does go
 * to Google before consent. It carries no cookie and no ID — that is the whole
 * mechanism — but it is a request, and that is the trade the design makes.
 *
 * The visitor's actual choice still lives in `src/lib/cookie-consent.ts`,
 * untouched. This module only translates it into Google's vocabulary.
 */

/** The seven signals Consent Mode v2 defines. */
type ConsentSignal =
  | "ad_storage"
  | "ad_user_data"
  | "ad_personalization"
  | "analytics_storage"
  | "functionality_storage"
  | "personalization_storage"
  | "security_storage";

type ConsentValue = "granted" | "denied";

type ConsentPayload = Partial<Record<ConsentSignal, ConsentValue>> & {
  wait_for_update?: number;
};

/**
 * Denied on arrival, everywhere, with no `region` carve-out.
 *
 * Google allows defaults to be granted outside the EEA. This does not do that:
 * the primary market is Ukraine and the expansion markets are Poland and the
 * rest of Europe, so the population that would be "outside" shrinks to nearly
 * nothing while the cost of getting the region list wrong is a genuine
 * compliance failure. One rule, applied to everyone, is also the only version
 * that can be reasoned about later.
 *
 * `security_storage` is granted because it covers fraud prevention and is
 * classed as strictly necessary; `functionality_storage` because it covers the
 * cart and locale cookies the site cannot work without, which the banner
 * already presents as necessary and does not offer to switch off.
 */
const DENIED_BY_DEFAULT: ConsentPayload = {
  ad_storage: "denied",
  ad_user_data: "denied",
  ad_personalization: "denied",
  analytics_storage: "denied",
  personalization_storage: "denied",
  functionality_storage: "granted",
  security_storage: "granted",
  /**
   * Hold tags for 500ms before they fire on the defaults, so a returning
   * visitor's stored "accept" — which this app reads from localStorage a
   * moment later — is applied to their very first pageview instead of the
   * one after it. Google's documented ceiling for this is 500ms; below ~200ms
   * a slow first paint can still lose the race.
   */
  wait_for_update: 500,
};

/**
 * Whether the defaults have been queued. Module-scoped rather than React
 * state: correctness here is about the *position* of an entry in `dataLayer`,
 * which has nothing to do with any component's lifecycle.
 */
let defaultsQueued = false;

/**
 * Put the denied defaults at the head of the queue, once.
 *
 * Every other function in this directory calls this before pushing anything,
 * which is what makes the ordering guarantee hold. It is not enough for the
 * component to push defaults on mount: GTM reads `dataLayer` from index 0 when
 * it initialises, so a `consent update` — or any event — that lands at a lower
 * index than the `default` is processed first, and the container spends that
 * moment believing consent was never configured. Routing every entry through
 * this makes an out-of-order push structurally impossible rather than merely
 * unlikely, and removes the dependency on when `next/script` happens to inject
 * the container relative to React's effects.
 */
export function ensureConsentDefaults(): void {
  if (defaultsQueued) return;
  // `typeof window` guard lives in `gtag`, which reports whether the push
  // landed. On the server it does not, and the flag stays down so the client
  // still queues the defaults for real.
  if (!gtag("consent", "default", DENIED_BY_DEFAULT)) return;
  defaultsQueued = true;
  gtag("set", "ads_data_redaction", true);
  gtag("js", new Date());
}

/**
 * Translate a recorded choice into Consent Mode signals.
 *
 * The banner offers two switches; Consent Mode has five that matter. The
 * mapping is a judgement, so it is written out rather than derived:
 * "analytics" governs measurement storage alone, while "marketing" governs
 * every advertising signal *and* `personalization_storage`, because
 * personalised content and personalised ads are the same promise to a visitor
 * and splitting them would let a "no to ads" still profile them.
 */
export function consentSignalsFor(
  choice: Pick<ConsentState, "analytics" | "marketing">,
): ConsentPayload {
  const analytics: ConsentValue = choice.analytics ? "granted" : "denied";
  const marketing: ConsentValue = choice.marketing ? "granted" : "denied";
  return {
    analytics_storage: analytics,
    ad_storage: marketing,
    ad_user_data: marketing,
    ad_personalization: marketing,
    personalization_storage: marketing,
  };
}

/**
 * Apply a decision. Called on mount for a returning visitor and again every
 * time the banner is used — including a *withdrawal*, which is why this sends
 * the denied signals explicitly instead of only sending grants: consent that
 * cannot be taken back is not consent.
 */
export function updateConsent(
  choice: Pick<ConsentState, "analytics" | "marketing">,
): void {
  ensureConsentDefaults();
  gtag("consent", "update", consentSignalsFor(choice));
}

/** Test seam — module state has to be resettable between cases. */
export function resetConsentModeForTests(): void {
  defaultsQueued = false;
}
