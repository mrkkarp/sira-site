import { describe, expect, it, beforeEach } from "vitest";
import {
  clientKeyFromRequest,
  isRateLimited,
  __resetRateLimitForTests,
  __rateLimitKeyCountForTests,
} from "./rate-limit";

describe("isRateLimited", () => {
  beforeEach(() => {
    __resetRateLimitForTests();
  });

  it("allows requests under the per-window limit", () => {
    const now = 1_000_000;
    for (let i = 0; i < 5; i++) {
      expect(isRateLimited("callback:1.2.3.4", now + i)).toBe(false);
    }
  });

  it("blocks once a key exceeds the per-window limit", () => {
    const now = 1_000_000;
    for (let i = 0; i < 5; i++) isRateLimited("callback:1.2.3.4", now + i);
    expect(isRateLimited("callback:1.2.3.4", now + 5)).toBe(true);
  });

  it("tracks different keys independently", () => {
    const now = 1_000_000;
    for (let i = 0; i < 5; i++) isRateLimited("callback:1.2.3.4", now + i);
    expect(isRateLimited("callback:5.6.7.8", now + 5)).toBe(false);
  });

  it("forgets hits once they age out of the window", () => {
    const now = 1_000_000;
    for (let i = 0; i < 5; i++) isRateLimited("callback:1.2.3.4", now + i);
    expect(isRateLimited("callback:1.2.3.4", now + 61_000)).toBe(false);
  });

  it("prunes fully-stale keys once the prune interval elapses, bounding memory growth", () => {
    const now = 1_000_000;
    // Simulate many distinct clients each hitting once, then going quiet.
    for (let i = 0; i < 50; i++) isRateLimited(`callback:client-${i}`, now);
    expect(__rateLimitKeyCountForTests()).toBe(50);

    // Long past both the 60s window and the 5-minute prune interval —
    // the next call (for an unrelated key) should sweep all 50 stale
    // entries away rather than holding onto them forever.
    isRateLimited("callback:client-new", now + 10 * 60_000);
    expect(__rateLimitKeyCountForTests()).toBe(1);
  });

  it("keeps a key's still-fresh hits intact when a sweep runs for a different key", () => {
    // Seed a hit, then let just under 5 minutes pass (no sweep yet) before
    // a second key's hit lands 1s before the 5-minute mark is finally
    // crossed by a third call — that third call's sweep must prune the
    // long-stale seed entry while leaving the second key's still-fresh
    // (< 60s old) entry untouched.
    isRateLimited("callback:seed", 300_000); // first-ever call always sweeps (lastPruneAt starts at 0)
    isRateLimited("callback:a", 599_000); // 299s after the sweep — no new sweep yet
    isRateLimited("callback:b", 600_000); // 300s after the sweep — triggers the next sweep

    expect(__rateLimitKeyCountForTests()).toBe(2); // "seed" pruned; "a" and "b" remain

    // "a"'s hit at 599_000 must still count towards its window, not have
    // been silently reset by the sweep.
    for (let i = 0; i < 4; i++) isRateLimited("callback:a", 600_500 + i);
    expect(isRateLimited("callback:a", 600_600)).toBe(true); // 6th hit within the window
  });
});

describe("clientKeyFromRequest", () => {
  it("reads the first address from x-forwarded-for", () => {
    const request = new Request("https://example.com", {
      headers: { "x-forwarded-for": "1.2.3.4, 5.6.7.8" },
    });
    expect(clientKeyFromRequest(request)).toBe("1.2.3.4");
  });

  it("falls back to 'unknown' when the header is absent", () => {
    const request = new Request("https://example.com");
    expect(clientKeyFromRequest(request)).toBe("unknown");
  });
});
