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
 *  - The deployment must also be serving its own canonical domain. See
 *    {@link isCanonicalDomain}.
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
/**
 * Is this deployment serving the site's own domain yet?
 *
 * `VERCEL_ENV === "production"` does not mean "the real site". It means "the
 * deployment built from the main branch" — which, until the domain is moved,
 * is `sira-site.vercel.app`. That deployment was emitting `index, follow` and
 * a `<link rel="canonical" href="https://sira-site.vercel.app/…">`: a full,
 * self-consistent, indexable copy of the shop on a domain that is supposed to
 * be temporary. Google indexing it before the migration is the one outcome
 * this whole cutover is meant to avoid — it would compete with odudlab.com's
 * own pages for the same queries, from a host with no history and no
 * redirects planned.
 *
 * `SEO_NOINDEX` existed to cover exactly this, and was simply never set. That
 * is the problem with a kill-switch whose safe position is "on": forgetting
 * it fails open. This derives the answer instead, from the variable that is
 * *already* the site's identity — `NEXT_PUBLIC_SITE_URL` feeds `metadataBase`,
 * every canonical, every hreflang, the sitemap and the OG tags. A `*.vercel.app`
 * hostname there means the domain has not been switched over yet, so nothing
 * is indexable; the day it is set to `https://odudlab.com`, canonicals and
 * indexing turn on together, in one edit, and cannot disagree.
 *
 * `SEO_NOINDEX` is kept as the manual override for everything this cannot
 * see — a staging domain that isn't a vercel.app, say.
 */
export function isCanonicalDomain(): boolean {
  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL;
  if (!siteUrl) return false;
  try {
    return !new URL(siteUrl).hostname.endsWith(".vercel.app");
  } catch {
    return false;
  }
}

export function isIndexable(locale?: Locale): boolean {
  if (process.env.SEO_NOINDEX === "true") return false;
  if (!isCanonicalDomain()) return false;
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

/**
 * What a dynamic route's `generateMetadata` returns when the thing the URL
 * names does not exist — an unknown product or collection slug.
 *
 * Without it the page inherits the root layout's `robots`, which on the live
 * site is `index, follow`, and the document goes out carrying two
 * contradictory directives: Next injects its own `<meta name="robots"
 * content="noindex">` for the 404, and the layout's `index, follow` sits
 * beside it. Google resolves a conflict by taking the most restrictive rule,
 * so nothing was actually being indexed — but "we won the tie-break" is not a
 * state to leave a migration in, and other crawlers get a vote too. Observed
 * on production, not inferred: `/products/<nonsense>` served both tags.
 *
 * These pages are the one place a 404 *status* cannot be produced. The proxy
 * 404s everything it can decide without a database (`isServedPath` in
 * `src/proxy.ts`); validating a slug is exactly the per-request lookup it must
 * not do. So the body streams with a `200` and this is what keeps it out of
 * the index.
 */
export const missingEntityMetadata: Metadata = {
  robots: { index: false, follow: false },
};
