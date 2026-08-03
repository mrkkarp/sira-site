"use client";

import { useState, useSyncExternalStore } from "react";
import type { Dictionary } from "@/i18n/get-dictionary";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import {
  readConsent,
  subscribeConsent,
  writeConsent,
} from "@/lib/cookie-consent";

type Panel = "banner" | "customize";

function hasDecidedSnapshot() {
  return readConsent() !== null;
}

/** SSR/first-hydration pass has no localStorage — assume "decided" so the
 * banner never flashes on the server, then `useSyncExternalStore` re-reads
 * the real value once mounted on the client. */
function hasDecidedServerSnapshot() {
  return true;
}

/**
 * Basic consent banner + inline preferences panel. No analytics/marketing
 * script exists yet, so this only implements the local consent
 * architecture (see `src/lib/cookie-consent.ts`) — once a real script is
 * added, it must check `hasConsent(...)` before loading, never before.
 *
 * Reads the stored decision via `useSyncExternalStore` (React's designed
 * API for synchronizing with an external store like localStorage) instead
 * of `useEffect` + `setState`, which avoids both a lint violation
 * (`react-hooks/set-state-in-effect`) and a hydration mismatch.
 */
export function CookieConsent({ dictionary }: { dictionary: Dictionary }) {
  const hasDecided = useSyncExternalStore(
    subscribeConsent,
    hasDecidedSnapshot,
    hasDecidedServerSnapshot,
  );
  const [dismissed, setDismissed] = useState(false);
  const [panel, setPanel] = useState<Panel>("banner");
  const [analytics, setAnalytics] = useState(false);
  const [marketing, setMarketing] = useState(false);

  if (hasDecided || dismissed) return null;

  function acceptAll() {
    writeConsent({ analytics: true, marketing: true });
    setDismissed(true);
  }

  function rejectOptional() {
    writeConsent({ analytics: false, marketing: false });
    setDismissed(true);
  }

  function savePreferences() {
    writeConsent({ analytics, marketing });
    setDismissed(true);
  }

  // `z-[45]` is deliberately between the header stack (40) and the modal tier
  // (50). At z-50 the banner tied with the fullscreen mobile menu, the search
  // drawer and every `DialogPrimitive`, and `layout.tsx` renders
  // `CookieConsent` *after* `Header`, so the tie broke in the banner's favour:
  // it painted over the bottom 188px of an open modal — hiding "Про нас",
  // "Дизайнерам" and the language switcher on a 375px viewport — and stayed
  // hit-testable above a dialog whose own content was not. That also
  // contradicted the dialog's `aria-modal="true"`, which tells assistive tech
  // everything outside it is unavailable. A notice is page furniture, not an
  // overlay: it belongs under the modal tier, and above the sticky bars
  // (back-to-top, mobile CTA) that it must not be buried by.
  return (
    <div
      role="region"
      aria-label={dictionary.cookieConsent.heading}
      className="bg-footer text-background border-background/10 fixed inset-x-0 bottom-0 z-[45] border-t"
    >
      <div className="mx-auto flex max-w-7xl flex-col gap-(--space-sm) px-(--space-sm) py-(--space-sm) sm:flex-row sm:items-center sm:justify-between">
        {panel === "banner" ? (
          <>
            <div className="max-w-2xl">
              <p className="type-body-sm font-medium">
                {dictionary.cookieConsent.heading}
              </p>
              <p className="type-caption text-background/70 mt-(--space-3xs)">
                {dictionary.cookieConsent.body}
              </p>
            </div>
            <div className="flex flex-wrap gap-(--space-2xs)">
              <Button
                variant="ghost-light"
                size="sm"
                onClick={() => setPanel("customize")}
              >
                {dictionary.cookieConsent.customize}
              </Button>
              <Button
                variant="outline-light"
                size="sm"
                onClick={rejectOptional}
              >
                {dictionary.cookieConsent.rejectOptional}
              </Button>
              <Button variant="primary-light" size="sm" onClick={acceptAll}>
                {dictionary.cookieConsent.acceptAll}
              </Button>
            </div>
          </>
        ) : (
          <div className="flex w-full flex-col gap-(--space-sm)">
            <p className="type-body-sm font-medium">
              {dictionary.cookieConsent.heading}
            </p>

            <div className="flex flex-col gap-(--space-xs)">
              <div>
                <Checkbox
                  label={dictionary.cookieConsent.necessaryTitle}
                  checked
                  disabled
                  readOnly
                />
                <p className="type-caption text-background/60 mt-(--space-3xs) ml-7">
                  {dictionary.cookieConsent.necessaryBody}
                </p>
              </div>
              <div>
                <Checkbox
                  label={dictionary.cookieConsent.analyticsTitle}
                  checked={analytics}
                  onChange={(event) => setAnalytics(event.target.checked)}
                />
                <p className="type-caption text-background/60 mt-(--space-3xs) ml-7">
                  {dictionary.cookieConsent.analyticsBody}
                </p>
              </div>
              <div>
                <Checkbox
                  label={dictionary.cookieConsent.marketingTitle}
                  checked={marketing}
                  onChange={(event) => setMarketing(event.target.checked)}
                />
                <p className="type-caption text-background/60 mt-(--space-3xs) ml-7">
                  {dictionary.cookieConsent.marketingBody}
                </p>
              </div>
            </div>

            <div className="flex flex-wrap gap-(--space-2xs)">
              <Button
                variant="ghost-light"
                size="sm"
                onClick={() => setPanel("banner")}
              >
                {dictionary.cookieConsent.back}
              </Button>
              <Button
                variant="primary-light"
                size="sm"
                onClick={savePreferences}
              >
                {dictionary.cookieConsent.save}
              </Button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
