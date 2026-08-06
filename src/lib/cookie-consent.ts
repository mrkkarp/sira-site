/**
 * Local cookie-consent architecture. There is no analytics/marketing script
 * wired up yet (see README "what's next") — this module only records the
 * visitor's choice so that, once a real script is added, it can check
 * `hasConsent("analytics" | "marketing")` before loading. Never load an
 * optional script before consent exists.
 */

export type ConsentCategory = "analytics" | "marketing";

export type ConsentState = {
  necessary: true;
  analytics: boolean;
  marketing: boolean;
  /** ISO timestamp of when the choice was recorded. */
  decidedAt: string;
};

const STORAGE_KEY = "odudlab:cookie-consent";

// Same-tab consent-change signal. The `storage` event only fires in *other*
// tabs, so a script gated on consent (e.g. the Google Analytics adapter)
// would not react to a grant made in the very tab it lives in without this.
// `writeConsent` dispatches it; `subscribeConsent` listens to both this and
// the cross-tab `storage` event.
const CONSENT_EVENT = "odudlab:consent-changed";

/**
 * A decision that was made but could NOT be written down, kept so it still
 * counts for the rest of this page load. Strictly a fallback: it is set only
 * when `localStorage.setItem` throws, and it is consulted only when storage
 * yields nothing.
 *
 * Storage genuinely fails on phones, and not rarely: with Safari's "Block All
 * Cookies" enabled, merely *touching* `window.localStorage` throws
 * `SecurityError`, and a full or partitioned store throws `QuotaExceededError`
 * on write. Without this the visitor's choice evaporated the instant it was
 * made and every consumer went on believing the banner was still undecided —
 * so the banner could not be got rid of, and `BackToTop`, which stands down
 * while the banner is up, never appeared at all.
 *
 * It must NOT double as a cache of successful writes. Doing that would make
 * this module ignore a store that was legitimately cleared — the visitor
 * revoking consent by wiping site data would go on being treated as having
 * agreed until they closed the tab.
 *
 * Module-level rather than component state: `readConsent` is called by
 * `useCookieBannerUndecided`, by `hasConsent` and by the consent-mode adapter,
 * none of which share a React tree with the banner.
 */
let unpersistedConsent: ConsentState | null = null;

export function readConsent(): ConsentState | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return unpersistedConsent;
    const parsed = JSON.parse(raw) as ConsentState;
    if (
      typeof parsed.analytics !== "boolean" ||
      typeof parsed.marketing !== "boolean"
    ) {
      return unpersistedConsent;
    }
    return parsed;
  } catch {
    return unpersistedConsent;
  }
}

export function writeConsent(choice: {
  analytics: boolean;
  marketing: boolean;
}): ConsentState {
  const state: ConsentState = {
    necessary: true,
    analytics: choice.analytics,
    marketing: choice.marketing,
    decidedAt: new Date().toISOString(),
  };
  if (typeof window !== "undefined") {
    try {
      window.localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
      unpersistedConsent = null;
    } catch {
      // Persistence is best-effort. This used to be unguarded, and the throw
      // propagated out of the banner's onClick — so React never reached
      // `setDismissed(true)`, the notice stayed on screen, and tapping
      // "Прийняти" appeared to do nothing at all. The choice still holds for
      // this page load; the visitor is simply asked again next time, which is
      // the correct failure mode for consent.
      unpersistedConsent = state;
    }
    // Notify same-tab listeners (`storage` only reaches other tabs).
    window.dispatchEvent(new CustomEvent(CONSENT_EVENT));
  }
  return state;
}

/** Convenience guard for gating optional scripts once they exist. */
export function hasConsent(category: ConsentCategory): boolean {
  return Boolean(readConsent()?.[category]);
}

/**
 * Subscribe to consent changes from both this tab (custom event) and other
 * tabs (`storage`). Returns an unsubscribe fn. Suitable as the `subscribe`
 * argument to React's `useSyncExternalStore`.
 */
export function subscribeConsent(onChange: () => void): () => void {
  if (typeof window === "undefined") return () => {};
  window.addEventListener("storage", onChange);
  window.addEventListener(CONSENT_EVENT, onChange);
  return () => {
    window.removeEventListener("storage", onChange);
    window.removeEventListener(CONSENT_EVENT, onChange);
  };
}
