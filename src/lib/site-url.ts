/**
 * No production domain has been confirmed by the owner yet (hosting is
 * paused). `NEXT_PUBLIC_SITE_URL` lets deploys set the real domain via env
 * var; the localhost fallback keeps `metadataBase`/structured-data URLs
 * valid for local dev without inventing a domain. Update the env var once a
 * domain is live — do not hardcode a guessed domain anywhere that imports this.
 */
export function getSiteUrl(): URL {
  return new URL(process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000");
}
