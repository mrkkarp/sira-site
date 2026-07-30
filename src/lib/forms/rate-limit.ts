import "server-only";

/**
 * Minimal in-memory sliding-window rate limiter for public form endpoints
 * (Prompt 8 §8 — "basic rate-limit architecture"). Deliberately simple:
 * this process holds the only copy of `hits`, which is correct for this
 * app's current single-instance deployment. A multi-instance deployment
 * would need a shared store (e.g. Redis) instead — noted here rather
 * than built, since no such deployment exists yet and building it now
 * would be speculative infrastructure with nothing to verify it against.
 */
const WINDOW_MS = 60_000;
const MAX_REQUESTS_PER_WINDOW = 5;

const hits = new Map<string, number[]>();

// Phase J hardening: without this, `hits` only ever grows — a key's
// timestamp array gets filtered down to empty once its hits age out,
// but the (now-empty-array) entry itself is never removed, so every
// distinct client key this process has *ever* seen (every visitor IP,
// for the lifetime of a long-running server) stays in memory forever.
// A lazy, infrequent full sweep bounds that growth without needing a
// background timer — the cost of checking every key is only ever paid
// once per `PRUNE_INTERVAL_MS`, on whichever request happens to land
// after that interval elapses.
const PRUNE_INTERVAL_MS = 5 * 60_000;
let lastPruneAt = 0;

function pruneStaleKeys(now: number): void {
  if (now - lastPruneAt < PRUNE_INTERVAL_MS) return;
  lastPruneAt = now;
  for (const [key, timestamps] of hits) {
    const fresh = timestamps.filter((timestamp) => now - timestamp < WINDOW_MS);
    if (fresh.length === 0) hits.delete(key);
    else if (fresh.length !== timestamps.length) hits.set(key, fresh);
  }
}

/** Records one hit for `key` and reports whether it exceeds the window's limit. */
export function isRateLimited(key: string, now: number = Date.now()): boolean {
  pruneStaleKeys(now);
  const timestamps = (hits.get(key) ?? []).filter(
    (timestamp) => now - timestamp < WINDOW_MS,
  );
  timestamps.push(now);
  hits.set(key, timestamps);
  return timestamps.length > MAX_REQUESTS_PER_WINDOW;
}

/** Best-effort client identity for rate-limiting — real client IP behind a proxy, else "unknown" (dev). */
export function clientKeyFromRequest(request: Request): string {
  const forwarded = request.headers.get("x-forwarded-for");
  return forwarded?.split(",")[0]?.trim() || "unknown";
}

/** Test-only escape hatch. */
export function __resetRateLimitForTests(): void {
  hits.clear();
  lastPruneAt = 0;
}

/** Test-only: how many distinct keys `hits` is currently holding, to verify pruning actually bounds memory. */
export function __rateLimitKeyCountForTests(): number {
  return hits.size;
}
