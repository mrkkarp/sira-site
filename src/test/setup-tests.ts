import { afterEach, vi } from "vitest";
import { cleanup } from "@testing-library/react";
import "@testing-library/jest-dom/vitest";

// jsdom ships neither observer API nor `matchMedia`. Components that use them
// for layout/scroll effects (e.g. `Header`'s sticky-height measurement and
// hero-transparency, `HeroCarousel`'s reduced-motion check) would throw a
// ReferenceError on mount in tests otherwise. Minimal no-op stand-ins — the
// effects that use them aren't the unit under test.
class NoopObserver {
  observe() {}
  unobserve() {}
  disconnect() {}
  takeRecords() {
    return [];
  }
}
if (!("ResizeObserver" in globalThis)) {
  globalThis.ResizeObserver = NoopObserver as unknown as typeof ResizeObserver;
}
if (!("IntersectionObserver" in globalThis)) {
  globalThis.IntersectionObserver =
    NoopObserver as unknown as typeof IntersectionObserver;
}
// `window.localStorage` here is a bare `{}` — no `getItem`/`setItem`/`clear`
// at all (Node 25 defines the global without a backing store, and jsdom
// defers to it). Anything reading it fails silently through the `try/catch`
// in `src/lib/cookie-consent.ts`, so consent would read as permanently
// undecided, and anything *writing* throws outright. A minimal in-memory
// Storage keeps localStorage-backed state (cookie consent, and whatever
// comes next) testable at its real API instead of via module mocks.
if (typeof globalThis.localStorage?.getItem !== "function") {
  const entries = new Map<string, string>();
  const memoryStorage: Storage = {
    get length() {
      return entries.size;
    },
    key: (index) => [...entries.keys()][index] ?? null,
    getItem: (key) => entries.get(String(key)) ?? null,
    setItem: (key, value) => void entries.set(String(key), String(value)),
    removeItem: (key) => void entries.delete(String(key)),
    clear: () => entries.clear(),
  };
  Object.defineProperty(globalThis, "localStorage", {
    value: memoryStorage,
    configurable: true,
    writable: true,
  });
}

if (!globalThis.matchMedia) {
  globalThis.matchMedia = ((query: string) => ({
    matches: false,
    media: query,
    onchange: null,
    addEventListener: vi.fn(),
    removeEventListener: vi.fn(),
    addListener: vi.fn(),
    removeListener: vi.fn(),
    dispatchEvent: vi.fn(),
  })) as unknown as typeof window.matchMedia;
}

// vitest.config.ts doesn't set `test.globals: true` (every test file imports
// `describe`/`it`/`expect` explicitly), so `@testing-library/react`'s
// auto-cleanup — which only self-registers when it detects global test
// hooks — never runs on its own. Without this, DOM from one `it()`'s
// `render()` leaks into the next within the same file. Register it here,
// once, for every test file (see `vitest.config.ts`'s `test.setupFiles`).
afterEach(() => {
  cleanup();
});
