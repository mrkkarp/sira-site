"use client";

import { Suspense, useEffect, useRef } from "react";
import Script from "next/script";
import { usePathname, useSearchParams } from "next/navigation";
import { gtmContainerId } from "@/lib/analytics/config";
import {
  ensureConsentDefaults,
  updateConsent,
} from "@/lib/analytics/consent-mode";
import { pushEvent } from "@/lib/analytics/data-layer";
import { ContactLinkTracker } from "@/components/analytics/contact-link-tracker";
import { readConsent, subscribeConsent } from "@/lib/cookie-consent";

/**
 * The Google Tag Manager container, and the only third-party tag loader in the
 * app.
 *
 * This replaces the previous `GoogleAnalytics` component rather than sitting
 * beside it. That component loaded `gtag/js` directly, and GA4 is now
 * delivered as a tag inside this container — running both would have had two
 * GA4 instances configured for the same property on the same page, which
 * double-counts every session and is invisible until someone compares GA to
 * the order table. `NEXT_PUBLIC_GA_MEASUREMENT_ID` is therefore no longer read
 * by any code; the measurement ID belongs in the container.
 *
 * Inert without `NEXT_PUBLIC_GTM_ID`: no script, no request, no cookie. Safe
 * to leave mounted in the layout while the container is still being built.
 */
export function GoogleTagManager() {
  const containerId = gtmContainerId();

  /**
   * Queued during render, deliberately, and this is the one line in the file
   * whose placement is load-bearing.
   *
   * `next/script` injects an `afterInteractive` script from inside its own
   * `useEffect` (verified in `next/dist/client/script.js`), and React runs
   * child effects before parent effects — so the container's bootstrap
   * executes *before* any effect written here could run. Queueing the denied
   * Consent Mode defaults from an effect would therefore have handed GTM a
   * queue with no consent configuration in it, and tags fire unrestricted in
   * that state. Doing it during render puts them in the array first.
   *
   * Safe as a render-phase call: it is idempotent, it no-ops entirely on the
   * server, and it touches nothing React owns — so a double render under
   * StrictMode, a re-render, or a discarded concurrent render all cost
   * nothing.
   */
  if (containerId) ensureConsentDefaults();

  /**
   * Apply the visitor's stored choice, and re-apply it whenever it changes —
   * including a withdrawal made from the cookie settings later in the session.
   *
   * Running a tick after the container bootstrap is fine and is what
   * `wait_for_update: 500` in `consent-mode.ts` exists for: tags hold briefly
   * so a returning visitor's "accept" reaches their first pageview rather than
   * their second. A visitor who has never decided has no stored choice, no
   * update is sent, and the denied defaults stand.
   */
  useEffect(() => {
    if (!containerId) return;
    const apply = () => {
      const choice = readConsent();
      if (choice) updateConsent(choice);
    };
    apply();
    return subscribeConsent(apply);
  }, [containerId]);

  if (!containerId) return null;

  return (
    <>
      <Script id="gtm-container" strategy="afterInteractive">
        {`(function(w,d,s,l,i){w[l]=w[l]||[];w[l].push({'gtm.start':new Date().getTime(),event:'gtm.js'});var f=d.getElementsByTagName(s)[0],j=d.createElement(s),dl=l!='dataLayer'?'&l='+l:'';j.async=true;j.src='https://www.googletagmanager.com/gtm.js?id='+i+dl;f.parentNode.insertBefore(j,f);})(window,document,'script','dataLayer','${containerId}');`}
      </Script>
      {/*
        `useSearchParams` opts its subtree out of prerendering, so the tracker
        is isolated behind its own boundary — without it, every page on the
        site would fall back to client-side rendering and the server-rendered
        HTML the whole SEO case rests on would disappear. The fallback is
        `null` because the component renders nothing anyway.

        Note the *absence* of GTM's `<noscript>` iframe, which the copy-paste
        snippet includes. That iframe fires the container for visitors with
        JavaScript off — and Consent Mode is JavaScript, so those are exactly
        the visitors whose consent signals cannot be honoured. It would be
        tracking precisely the people we cannot ask.
      */}
      <Suspense fallback={null}>
        <PageviewTracker />
      </Suspense>
      {/*
        Mounted here rather than in the layout so it inherits the same
        inert-without-a-container guarantee as everything else in this file:
        no container, no listener. It needs no Suspense boundary of its own —
        unlike `PageviewTracker` it reads no search params, so it does not opt
        anything out of prerendering.
      */}
      <ContactLinkTracker />
    </>
  );
}

/**
 * A `page_view` for client-side navigations.
 *
 * The container only bootstraps once per full page load, so in an App Router
 * app every subsequent `<Link>` navigation is invisible to it. GTM's built-in
 * History Change trigger does notice the `pushState`, but it fires at the
 * moment the URL changes — before React has rendered the new route or updated
 * `document.title` — so the pageview it produces carries the *previous*
 * page's title. An explicit event pushed from an effect, after the route has
 * settled, carries the right one.
 *
 * The first URL of the session is skipped: GA4's configuration tag already
 * sends a pageview when the container loads, and firing here as well would
 * count every landing page twice — which inflates exactly the sessions that
 * matter, the ones arriving from a paid ad.
 */
function PageviewTracker() {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const search = searchParams.toString();
  const initialUrl = useRef<string | null>(null);

  useEffect(() => {
    const url = search ? `${pathname}?${search}` : pathname;
    if (initialUrl.current === null) {
      initialUrl.current = url;
      return;
    }
    if (initialUrl.current === url) return;
    initialUrl.current = url;
    pushEvent({
      event: "page_view",
      page_path: url,
      page_location: window.location.href,
      page_title: document.title,
    });
  }, [pathname, search]);

  return null;
}
