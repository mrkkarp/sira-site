// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const STORAGE_KEY = "odudlab:cookie-consent";

/**
 * Each case re-imports the module so the module-level `sessionConsent` starts
 * empty — it is deliberately per-page-load state, and a leftover value from a
 * previous case would make the storage-failure tests pass for the wrong reason.
 */
async function freshModule() {
  vi.resetModules();
  return import("@/lib/cookie-consent");
}

/**
 * Replace `window.localStorage` with something that throws the way a real
 * phone does. Safari with "Block All Cookies" throws `SecurityError` on the
 * property access itself; a full or partitioned store throws
 * `QuotaExceededError` from `setItem`.
 */
function breakStorage(mode: "access" | "setItem") {
  const store = new Map<string, string>();
  const throwing = {
    getItem: (key: string) => store.get(key) ?? null,
    setItem: () => {
      throw new DOMException("quota", "QuotaExceededError");
    },
    removeItem: (key: string) => void store.delete(key),
    clear: () => store.clear(),
    key: () => null,
    length: 0,
  };
  Object.defineProperty(window, "localStorage", {
    configurable: true,
    get() {
      if (mode === "access") {
        throw new DOMException("blocked", "SecurityError");
      }
      return throwing;
    },
  });
}

const realStorage = Object.getOwnPropertyDescriptor(window, "localStorage");

beforeEach(() => {
  window.localStorage?.clear?.();
});

afterEach(() => {
  if (realStorage) Object.defineProperty(window, "localStorage", realStorage);
  vi.restoreAllMocks();
});

describe("writeConsent / readConsent", () => {
  it("persists a decision and reads it back", async () => {
    const { writeConsent, readConsent, hasConsent } = await freshModule();

    writeConsent({ analytics: true, marketing: false });

    expect(JSON.parse(window.localStorage.getItem(STORAGE_KEY)!)).toMatchObject({
      necessary: true,
      analytics: true,
      marketing: false,
    });
    expect(readConsent()).toMatchObject({ analytics: true, marketing: false });
    expect(hasConsent("analytics")).toBe(true);
    expect(hasConsent("marketing")).toBe(false);
  });

  it("reports no decision before one is made", async () => {
    const { readConsent } = await freshModule();
    expect(readConsent()).toBeNull();
  });

  it("ignores a malformed stored value", async () => {
    const { readConsent } = await freshModule();
    window.localStorage.setItem(STORAGE_KEY, "{not json");
    expect(readConsent()).toBeNull();
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify({ analytics: 1 }));
    expect(readConsent()).toBeNull();
  });
});

/**
 * The bug this guards: `setItem` was unguarded, so on a phone that refuses
 * storage the throw escaped the banner's `onClick`. React never reached
 * `setDismissed(true)`, so tapping "Прийняти" did nothing and the notice could
 * not be dismissed — and `BackToTop`, which stands down while the banner is
 * undecided, stayed hidden for the whole visit.
 */
describe("storage that refuses to cooperate", () => {
  it.each(["access", "setItem"] as const)(
    "still records the decision when localStorage throws on %s",
    async (mode) => {
      const { writeConsent, readConsent } = await freshModule();
      breakStorage(mode);

      expect(() =>
        writeConsent({ analytics: false, marketing: false }),
      ).not.toThrow();

      // The decision holds for this page load even though nothing persisted,
      // so the banner comes down and the bottom bars are released.
      expect(readConsent()).toMatchObject({
        necessary: true,
        analytics: false,
        marketing: false,
      });
    },
  );

  it("still notifies subscribers when the write fails", async () => {
    const { writeConsent, subscribeConsent } = await freshModule();
    breakStorage("setItem");

    const onChange = vi.fn();
    const unsubscribe = subscribeConsent(onChange);
    writeConsent({ analytics: true, marketing: true });

    expect(onChange).toHaveBeenCalled();
    unsubscribe();
  });

  it("does not invent a decision that was never made", async () => {
    const { readConsent } = await freshModule();
    breakStorage("access");
    expect(readConsent()).toBeNull();
  });

  /**
   * The in-memory fallback must not double as a cache of *successful* writes,
   * or wiping site data would not revoke consent: this module would keep
   * answering "agreed" until the tab was closed.
   */
  it("forgets a persisted decision once the store is cleared", async () => {
    const { writeConsent, readConsent } = await freshModule();
    writeConsent({ analytics: true, marketing: true });
    expect(readConsent()).not.toBeNull();

    window.localStorage.clear();
    expect(readConsent()).toBeNull();
  });
});
