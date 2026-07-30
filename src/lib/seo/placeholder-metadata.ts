import type { Metadata } from "next";
import { locales, type Locale } from "@/i18n/config";
import { localeHref } from "@/lib/locale-href";

function noIndexMetadata(
  locale: Locale,
  path: string,
  title: string,
): Metadata {
  const canonicalPath = localeHref(locale, path);
  return {
    title,
    alternates: {
      canonical: canonicalPath,
      languages: Object.fromEntries(
        locales.map((altLocale) => [altLocale, localeHref(altLocale, path)]),
      ),
    },
    robots: {
      index: false,
      follow: true,
    },
  };
}

/**
 * Shared `generateMetadata` body for every route still on the
 * `PlaceholderPage` shell (Prompt 9 §4/§6 — SEO + content audit).
 *
 * These routes render nothing but a title and the same generic "page in
 * development" body copy (`dictionary.placeholder.*`) — see
 * `src/components/placeholder-page.tsx` and `CONTENT_CHECKLIST.md` for the
 * full list and what real content each one is still waiting on. Indexing a
 * dozen-plus routes that all share that identical body text would read to
 * search engines as thin/duplicate content, so these are deliberately
 * `noindex` (still `follow`, so crawl budget isn't wasted and any real
 * internal links from a placeholder page are still reachable) until each
 * page gets real, owner-confirmed content and is switched to normal
 * indexable metadata at that point.
 */
export function buildPlaceholderMetadata(
  locale: Locale,
  path: string,
  title: string,
): Metadata {
  return noIndexMetadata(locale, path, title);
}

/**
 * Shared `generateMetadata` body for real (non-placeholder) but
 * inherently non-indexable utility routes — `/cart`, `/checkout`,
 * `/order-status`. These have working functionality, just nothing a search
 * engine should ever rank: a cart/checkout has no stable canonical content
 * (it's per-session state), and order-status is a private lookup form.
 * Before this fix they had no `generateMetadata` at all and silently
 * inherited the root layout's site-wide `index: true` default.
 */
export function buildUtilityPageMetadata(
  locale: Locale,
  path: string,
  title: string,
): Metadata {
  return noIndexMetadata(locale, path, title);
}
