import { describe, expect, it, vi, afterEach } from "vitest";
import { render, act } from "@testing-library/react";
import { GoogleAnalytics } from "@/components/analytics/google-analytics";

// next/script's real loader is a no-op in jsdom; a passthrough that renders a
// tagged <script> lets us assert whether the adapter tried to inject gtag.
vi.mock("next/script", () => ({
  default: ({ id, src }: { id: string; src?: string }) => (
    <script data-testid={`script-${id}`} data-src={src} />
  ),
}));

// Control consent directly rather than through localStorage (jsdom's storage
// is not fully implemented in this environment). `analyticsValue` is what
// `hasConsent("analytics")` returns; `listeners` lets a test fire a change.
let analyticsValue = false;
const listeners = new Set<() => void>();
vi.mock("@/lib/cookie-consent", () => ({
  hasConsent: () => analyticsValue,
  subscribeConsent: (cb: () => void) => {
    listeners.add(cb);
    return () => listeners.delete(cb);
  },
}));

function grantConsent() {
  analyticsValue = true;
  act(() => {
    listeners.forEach((cb) => cb());
  });
}

/**
 * The GA adapter must be inert until BOTH an env measurement ID exists AND the
 * visitor has granted analytics consent — so it is safe to mount in every
 * layout today while the owner has no GA property. These lock that contract.
 */
describe("GoogleAnalytics", () => {
  afterEach(() => {
    vi.unstubAllEnvs();
    analyticsValue = false;
    listeners.clear();
  });

  it("renders nothing when no measurement ID is configured", () => {
    vi.stubEnv("NEXT_PUBLIC_GA_MEASUREMENT_ID", "");
    analyticsValue = true; // even with consent, no ID means no tracking
    const { container } = render(<GoogleAnalytics />);
    expect(container).toBeEmptyDOMElement();
  });

  it("renders nothing when an ID is set but analytics consent is absent", () => {
    vi.stubEnv("NEXT_PUBLIC_GA_MEASUREMENT_ID", "G-TEST123");
    analyticsValue = false;
    const { queryByTestId } = render(<GoogleAnalytics />);
    expect(queryByTestId("script-ga-loader")).not.toBeInTheDocument();
  });

  it("loads gtag with the configured ID once analytics consent is granted", () => {
    vi.stubEnv("NEXT_PUBLIC_GA_MEASUREMENT_ID", "G-TEST123");
    const { queryByTestId } = render(<GoogleAnalytics />);
    expect(queryByTestId("script-ga-loader")).not.toBeInTheDocument();

    grantConsent();

    const loader = queryByTestId("script-ga-loader");
    expect(loader).toBeInTheDocument();
    expect(loader).toHaveAttribute(
      "data-src",
      "https://www.googletagmanager.com/gtag/js?id=G-TEST123",
    );
    expect(queryByTestId("script-ga-init")).toBeInTheDocument();
  });
});
