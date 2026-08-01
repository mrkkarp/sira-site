import type { Metadata } from "next";

/**
 * Single source of truth for "may search engines index this deployment?".
 *
 * Only the real **production** deployment is indexable, and only while the
 * `SEO_NOINDEX` kill-switch is not set:
 *  - Vercel sets `VERCEL_ENV` to `"production" | "preview" | "development"`.
 *    Preview (per-branch / per-PR) and development deployments — and local dev,
 *    where `VERCEL_ENV` is unset — must NEVER be indexed, or Google ends up
 *    serving half-finished staging URLs and splitting ranking signals across
 *    duplicate hosts.
 *  - `SEO_NOINDEX=true` forces noindex even on production. This is the
 *    pre-launch kill-switch: keep it set on the production deployment until the
 *    real domain is switched on (the owner's "switch domain only after P0 is
 *    done" gate), then unset it to open the site to indexing.
 *
 * The **authoritative** enforcement is the site-wide `X-Robots-Tag: noindex,
 * nofollow` response header in `next.config.ts`, which mirrors this logic. A
 * header (not just `<meta name="robots">`) is required because a page's own
 * `generateMetadata` overrides the root layout's `robots` field, so a
 * metadata-only approach would leak every explicitly-indexable route (e.g.
 * `/contact`, product pages) on previews. This helper lets the metadata layer
 * agree with that header so the emitted `<meta>` is never contradictory.
 *
 * Keep the condition here in lockstep with `next.config.ts` — the config
 * cannot import this module (it is evaluated outside the app's module graph),
 * so the two intentionally duplicate one small `process.env` check.
 */
export function isIndexable(): boolean {
  if (process.env.SEO_NOINDEX === "true") return false;
  return process.env.VERCEL_ENV === "production";
}

/** The `robots` value for Next `Metadata`, derived from {@link isIndexable}. */
export function robotsMetadata(): Metadata["robots"] {
  return isIndexable()
    ? { index: true, follow: true }
    : { index: false, follow: false };
}
