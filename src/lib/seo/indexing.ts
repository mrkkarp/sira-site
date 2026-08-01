import type { Metadata } from "next";
import type { Locale } from "@/i18n/config";

/**
 * The locales whose content is a real, human-authored translation and may
 * therefore be indexed. The store's canonical content is Ukrainian; the `en`
 * and `pl` routes currently resolve every product/page field to the Ukrainian
 * source via Payload's localization fallback (there is no distinct EN/PL
 * product copy yet). Indexing them would feed Google duplicate Ukrainian
 * content under English/Polish URLs and dilute the `uk` pages' ranking, so
 * only `uk` is advertised (hreflang, sitemap) and indexable. Add a locale here
 * once its translations are actually authored.
 */
export const indexableLocales: readonly Locale[] = ["uk"];

/** Whether a given locale's routes may be indexed (see {@link indexableLocales}). */
export function isIndexableLocale(locale: Locale): boolean {
  return indexableLocales.includes(locale);
}

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
export function isIndexable(locale?: Locale): boolean {
  if (process.env.SEO_NOINDEX === "true") return false;
  if (locale !== undefined && !isIndexableLocale(locale)) return false;
  return process.env.VERCEL_ENV === "production";
}

/**
 * The `robots` value for Next `Metadata`, derived from {@link isIndexable}.
 *
 * Pass the current `locale` so non-indexable locales (`en`/`pl`) emit
 * `noindex` even on production — the root `[locale]/layout` does this, and
 * because a page's own `generateMetadata` merges over the layout's `robots`,
 * only pages that don't set their own `robots` inherit it. The override-proof
 * `X-Robots-Tag` header still covers the deployment-level (preview) case.
 */
export function robotsMetadata(locale?: Locale): Metadata["robots"] {
  return isIndexable(locale)
    ? { index: true, follow: true }
    : { index: false, follow: false };
}
