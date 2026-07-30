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

export function readConsent(): ConsentState | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as ConsentState;
    if (
      typeof parsed.analytics !== "boolean" ||
      typeof parsed.marketing !== "boolean"
    ) {
      return null;
    }
    return parsed;
  } catch {
    return null;
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
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
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
