import { describe, expect, it, vi, beforeEach, afterEach } from "vitest";
import { useEffect } from "react";
import { render, act } from "@testing-library/react";
import { GoogleTagManager } from "@/components/analytics/google-tag-manager";
import { resetConsentModeForTests } from "@/lib/analytics/consent-mode";
import type { ConsentState } from "@/lib/cookie-consent";

/**
 * `next/script`'s real `afterInteractive` loader injects the container from
 * inside its own `useEffect` — verified in `next/dist/client/script.js`. This
 * stand-in reproduces exactly that timing, because the timing is the thing
 * under test: React runs child effects before parent effects, so the real
 * container bootstraps before any effect in `GoogleTagManager` could. A mock
 * that rendered a plain `<script>` synchronously would make the ordering test
 * below pass for the wrong reason.
 */
vi.mock("next/script", () => {
  function MockScript({ id, children }: { id: string; children?: string }) {
    useEffect(() => {
      window.dataLayer = window.dataLayer ?? [];
      window.dataLayer.push({ "gtm.start": Date.now(), event: "gtm.js" });
    }, []);
    return <script data-testid={`script-${id}`} data-body={children} />;
  }
  return { default: MockScript };
});

let pathname = "/rakovyny";
let search = "";
vi.mock("next/navigation", () => ({
  usePathname: () => pathname,
  useSearchParams: () => new URLSearchParams(search),
}));

let stored: ConsentState | null = null;
const listeners = new Set<() => void>();
vi.mock("@/lib/cookie-consent", () => ({
  readConsent: () => stored,
  subscribeConsent: (onChange: () => void) => {
    listeners.add(onChange);
    return () => listeners.delete(onChange);
  },
}));

function decide(choice: { analytics: boolean; marketing: boolean }) {
  stored = { necessary: true, ...choice, decidedAt: "2026-08-04T00:00:00.000Z" };
  act(() => {
    listeners.forEach((notify) => notify());
  });
}

const queue = () => window.dataLayer ?? [];
const isCommand = (entry: unknown) =>
  Object.prototype.toString.call(entry) === "[object Arguments]";
const commands = () =>
  queue().filter(isCommand).map((entry) => Array.from(entry as IArguments));
const events = () =>
  queue().filter(
    (entry): entry is Record<string, unknown> =>
      Object.prototype.toString.call(entry) === "[object Object]",
  );

describe("GoogleTagManager", () => {
  beforeEach(() => {
    delete window.dataLayer;
    resetConsentModeForTests();
    stored = null;
    listeners.clear();
    pathname = "/rakovyny";
    search = "";
    vi.stubEnv("NEXT_PUBLIC_GTM_ID", "GTM-MXP7JRJS");
  });

  afterEach(() => {
    vi.unstubAllEnvs();
  });

  describe("without a configured container", () => {
    it("renders nothing and touches no queue", () => {
      vi.stubEnv("NEXT_PUBLIC_GTM_ID", "");
      const { container } = render(<GoogleTagManager />);
      expect(container).toBeEmptyDOMElement();
      expect(window.dataLayer).toBeUndefined();
    });

    it("refuses an ID that is not a GTM container", () => {
      // A GA4 measurement ID pasted into the wrong variable is the likely
      // mistake, and it fails silently otherwise: GTM serves a 404 and the
      // site just stops measuring.
      vi.stubEnv("NEXT_PUBLIC_GTM_ID", "G-NVN5N75R7J");
      const { container } = render(<GoogleTagManager />);
      expect(container).toBeEmptyDOMElement();
    });
  });

  describe("with a container", () => {
    it("loads it with the configured ID", () => {
      const { getByTestId } = render(<GoogleTagManager />);
      expect(getByTestId("script-gtm-container")).toHaveAttribute(
        "data-body",
        expect.stringContaining("GTM-MXP7JRJS"),
      );
    });

    it("does not ship GTM's <noscript> iframe", () => {
      // The copy-paste snippet includes one. It fires the container for
      // visitors with JavaScript off — and Consent Mode is JavaScript, so
      // those are precisely the visitors whose consent cannot be honoured.
      const { container } = render(<GoogleTagManager />);
      expect(container.querySelector("noscript")).toBeNull();
      expect(container.querySelector("iframe")).toBeNull();
    });
  });

  describe("consent ordering", () => {
    it("queues the denied defaults before the container bootstraps", () => {
      // The claim the whole design rests on. `next/script` injects from an
      // effect and React runs child effects first, so defaults queued from an
      // effect here would land *after* GTM had already read the queue and
      // found no consent configuration — a state in which tags fire freely.
      render(<GoogleTagManager />);
      const gtmStart = queue().findIndex(
        (entry) => (entry as { event?: string })?.event === "gtm.js",
      );
      const consentDefault = queue().findIndex(
        (entry) => isCommand(entry) && Array.from(entry as IArguments)[1] === "default",
      );
      expect(consentDefault).toBe(0);
      expect(gtmStart).toBeGreaterThan(consentDefault);
    });

    it("sends no update for a visitor who has not decided yet", () => {
      render(<GoogleTagManager />);
      expect(commands().some(([, kind]) => kind === "update")).toBe(false);
    });
  });

  describe("applying the visitor's choice", () => {
    it("replays a returning visitor's stored consent on mount", () => {
      stored = {
        necessary: true,
        analytics: true,
        marketing: true,
        decidedAt: "2026-08-01T00:00:00.000Z",
      };
      render(<GoogleTagManager />);
      const update = commands().find(([, kind]) => kind === "update");
      expect(update?.[2]).toMatchObject({
        analytics_storage: "granted",
        ad_storage: "granted",
      });
    });

    it("reacts to a decision made in this tab", () => {
      render(<GoogleTagManager />);
      decide({ analytics: true, marketing: false });
      const update = commands().find(([, kind]) => kind === "update");
      expect(update?.[2]).toMatchObject({
        analytics_storage: "granted",
        ad_storage: "denied",
      });
    });

    it("carries a withdrawal through as denials", () => {
      // Consent that cannot be taken back is not consent.
      render(<GoogleTagManager />);
      decide({ analytics: true, marketing: true });
      decide({ analytics: false, marketing: false });
      const updates = commands().filter(([, kind]) => kind === "update");
      expect(updates[updates.length - 1][2]).toMatchObject({
        analytics_storage: "denied",
        ad_storage: "denied",
        ad_user_data: "denied",
        ad_personalization: "denied",
      });
    });
  });

  describe("pageviews on client-side navigation", () => {
    it("does not fire for the URL the session started on", () => {
      // GA4's configuration tag already sends a pageview when the container
      // loads. Firing here as well would double-count every landing page —
      // and landing pages are exactly where the paid traffic arrives.
      render(<GoogleTagManager />);
      expect(events().some((event) => event.event === "page_view")).toBe(false);
    });

    it("fires when the path changes", () => {
      const { rerender } = render(<GoogleTagManager />);
      pathname = "/vazony";
      act(() => rerender(<GoogleTagManager />));
      const pageview = events().find((event) => event.event === "page_view");
      expect(pageview).toMatchObject({ page_path: "/vazony" });
    });

    it("fires when only the query string changes", () => {
      // Filtering and paging the catalogue changes the URL without changing
      // the path; those are real pageviews.
      const { rerender } = render(<GoogleTagManager />);
      search = "page=2";
      act(() => rerender(<GoogleTagManager />));
      expect(events().find((event) => event.event === "page_view")).toMatchObject({
        page_path: "/rakovyny?page=2",
      });
    });

    it("carries the title of the page it has navigated to", () => {
      // The reason this is not left to GTM's built-in History Change trigger:
      // that fires the moment the URL changes, before React has rendered the
      // new route, so its pageview carries the previous page's title.
      const { rerender } = render(<GoogleTagManager />);
      document.title = "Вазони — ODUDLAB";
      pathname = "/vazony";
      act(() => rerender(<GoogleTagManager />));
      expect(events().find((event) => event.event === "page_view")).toMatchObject(
        { page_title: "Вазони — ODUDLAB" },
      );
    });

    it("does not fire again when the URL has not moved", () => {
      const { rerender } = render(<GoogleTagManager />);
      act(() => rerender(<GoogleTagManager />));
      act(() => rerender(<GoogleTagManager />));
      expect(events().filter((event) => event.event === "page_view")).toHaveLength(0);
    });
  });
});
