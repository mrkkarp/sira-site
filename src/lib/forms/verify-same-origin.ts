import "server-only";

/**
 * CSRF-safe approach for these JSON POST endpoints (Prompt 8 §8). A plain
 * cross-site `<form>` submission can't reach them: they require
 * `Content-Type: application/json`, which forces a CORS preflight, and
 * these routes never send back an `Access-Control-Allow-Origin` header,
 * so the browser blocks the response from ever reaching attacker script.
 * The one gap that leaves is a same-site (different-origin, same
 * registrable domain) request, so this adds a simple, explicit
 * `Origin`/`Host` match as a second guard — deliberately not a full
 * token-based CSRF scheme, which would be disproportionate for a
 * same-origin single-page form flow with no cross-site use case.
 */
export function isSameOriginRequest(request: Request): boolean {
  const host = request.headers.get("host");
  if (!host) return false;

  const origin = request.headers.get("origin");
  if (!origin) return true; // Same-origin requests often omit Origin entirely.

  try {
    return new URL(origin).host === host;
  } catch {
    return false;
  }
}
