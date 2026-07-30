"use client";

import { useSyncExternalStore } from "react";
import Script from "next/script";
import { hasConsent, subscribeConsent } from "@/lib/cookie-consent";

/**
 * Consent-gated Google Analytics 4 adapter (Prompt "optimization" §19).
 *
 * Deliberately inert until BOTH conditions hold, so it is safe to mount
 * unconditionally in the root layout today:
 *
 *   1. `NEXT_PUBLIC_GA_MEASUREMENT_ID` is set. The owner has not provided a
 *      real GA property yet, so no measurement ID is invented here — with the
 *      env var unset this component renders `null` and ships zero analytics
 *      code. Set the env var once a real `G-XXXXXXXXXX` property exists.
 *
 *   2. The visitor has granted the "analytics" cookie-consent category. GA is
 *      never loaded before consent (GDPR/ePrivacy). `useSyncExternalStore`
 *      re-reads consent whenever it changes — including in this same tab, via
 *      the custom event `writeConsent` dispatches — so granting consent loads
 *      gtag immediately, and it simply never loads for visitors who decline.
 *
 * No cookies, no network requests, no `gtag` global exist until both are true.
 */
export function GoogleAnalytics() {
  const measurementId = process.env.NEXT_PUBLIC_GA_MEASUREMENT_ID;

  const analyticsAllowed = useSyncExternalStore(
    subscribeConsent,
    () => hasConsent("analytics"),
    // Server / first-hydration pass: no localStorage, so treat as no consent.
    // gtag is a client-only, post-interaction concern anyway.
    () => false,
  );

  if (!measurementId || !analyticsAllowed) return null;

  return (
    <>
      <Script
        id="ga-loader"
        strategy="afterInteractive"
        src={`https://www.googletagmanager.com/gtag/js?id=${measurementId}`}
      />
      <Script id="ga-init" strategy="afterInteractive">
        {`
          window.dataLayer = window.dataLayer || [];
          function gtag(){dataLayer.push(arguments);}
          gtag('js', new Date());
          gtag('config', '${measurementId}', { anonymize_ip: true });
        `}
      </Script>
    </>
  );
}
