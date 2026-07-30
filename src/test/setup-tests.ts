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
