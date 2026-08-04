"use client";

import { useEffect } from "react";
import { trackMessengerClick, trackPhoneClick } from "@/lib/analytics/events";

/**
 * `phone_click` and `messenger_click`, measured by delegation.
 *
 * The obvious implementation — an `onClick` on each anchor — was rejected, and
 * the reason is worth stating because it is not about elegance. The six links
 * concerned live in `footer.tsx` and `contact/contact-content.tsx`, both of
 * which are **Server Components**. An `onClick` would force a `"use client"`
 * on them, and the footer is on every page of the site: its whole markup would
 * ship a second time as JavaScript and hydrate on every route. That trades the
 * server-rendered-HTML property the entire SEO case rests on for a click
 * handler.
 *
 * So instead one listener sits on the document and reads the link that was
 * clicked. Two consequences, both good:
 *
 *   - The server components stay server components. A `data-analytics-location`
 *     attribute is plain HTML; a server component can render it freely.
 *   - Any `tel:` or messenger link added anywhere later is measured without
 *     anyone remembering to wire it up. "Every tel: link on this site is a
 *     phone_click" is a true statement about the site, so encoding it once is
 *     more honest than repeating it per call site — and a forgotten handler is
 *     invisible: the conversion simply never appears, and nothing errors.
 *
 * This is what GTM's own built-in click trigger does. Doing it here instead
 * keeps it in the repository and under test, which is the entire thesis of
 * `events.ts`.
 */

/** `t.me` is the one in `config/contact.ts`; the others are its aliases. */
const TELEGRAM_HOSTS = new Set(["t.me", "telegram.me", "telegram.dog"]);

/**
 * Which messenger a link opens, or `null` if it is an ordinary link.
 *
 * Telegram's deep link is an ordinary `https://` URL, so matching on the
 * scheme alone is not enough — the host has to be checked, or every external
 * link on the site would report itself as a messenger handoff.
 */
function messengerChannel(url: URL): "viber" | "telegram" | null {
  if (url.protocol === "viber:") return "viber";
  if (TELEGRAM_HOSTS.has(url.hostname.toLowerCase())) return "telegram";
  return null;
}

/**
 * Where on the site the link was. Read from the nearest ancestor carrying
 * `data-analytics-location`, so a phone tap in the footer and one on the
 * contact page are separable in GA4 rather than being one undifferentiated
 * number.
 *
 * A missing attribute reports `"unknown"` rather than falling back to the
 * pathname: the pathname would produce a different value per page and quietly
 * shred the dimension into hundreds of rows, whereas `"unknown"` shows up as
 * one obvious row that says a link needs labelling.
 */
function locationOf(anchor: Element): string {
  return (
    anchor
      .closest("[data-analytics-location]")
      ?.getAttribute("data-analytics-location") ?? "unknown"
  );
}

export function ContactLinkTracker() {
  useEffect(() => {
    function handleClick(event: MouseEvent) {
      const target = event.target;
      if (!(target instanceof Element)) return;
      const anchor = target.closest("a[href]");
      if (!anchor) return;

      const href = anchor.getAttribute("href");
      if (!href) return;

      let url: URL;
      try {
        url = new URL(href, window.location.href);
      } catch {
        return; // Not a resolvable URL — nothing to classify.
      }

      if (url.protocol === "tel:") {
        trackPhoneClick({ location: locationOf(anchor) });
        return;
      }

      const channel = messengerChannel(url);
      if (channel) {
        trackMessengerClick({ channel, location: locationOf(anchor) });
      }
    }

    /*
      Capture phase, deliberately. A `tel:` tap on a phone hands off to the
      dialer immediately, so the push has to be in the queue before anything
      downstream can call `preventDefault`, `stopPropagation`, or navigate. In
      the capture phase this runs before every other handler on the page, which
      is the only ordering that survives all three.
    */
    document.addEventListener("click", handleClick, true);
    return () => document.removeEventListener("click", handleClick, true);
  }, []);

  return null;
}
