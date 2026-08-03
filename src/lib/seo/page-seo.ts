import type { Metadata } from "next";
import { defaultLocale, type Locale } from "@/i18n/config";
import { localeHref } from "@/lib/locale-href";
import { getSiteUrl } from "@/lib/site-url";
import { indexableLocales } from "./indexing";

/**
 * The share card every page falls back to: a real photograph of the workshop
 * (the same `public/hero/hero-workshop.jpg` the homepage hero uses), cropped
 * to the 1200×630 that Facebook/Telegram/Viber/LinkedIn all render at. No
 * stock, no AI, no generated "title on a gradient" card — see
 * IMAGE_REQUIREMENTS.md.
 *
 * A fallback is the whole point. Product pages pass their own variant photo,
 * which is strictly better; every other page had *nothing*, and a link with
 * no picture is a link nobody clicks.
 */
export const SHARE_CARD = {
  path: "/share/share-card.jpg",
  width: 1200,
  height: 630,
} as const;

interface PageSeoInput {
  locale: Locale;
  /** Locale-less path, e.g. `/shop` — `localeHref` prefixes it. */
  path: string;
  title: string;
  description: string;
  siteName: string;
  /**
   * A page-specific share image (a product photo, a collection cover). Site
   * -relative or absolute; resolved against the site URL either way. Omit it
   * and the page gets {@link SHARE_CARD}.
   */
  image?: string;
  /**
   * Narrows which locales are advertised as alternates, for pages that are
   * indexable in some locales but not others. `/care`, `/returns` and
   * `/payment-delivery` need this: their Ukrainian source has real prose, but
   * the `en`/`pl` versions fall through to the `noindex` placeholder, and
   * pointing hreflang at a `noindex` page is a contradiction Google reports as
   * an error. Defaults to every {@link indexableLocales} entry.
   */
  hreflangLocales?: readonly Locale[];
}

/**
 * Builds the `alternates` + `openGraph` half of a page's `Metadata`.
 *
 * This exists because both halves were copy-pasted into ten `generateMetadata`
 * functions, and copy-paste drifts. It had already drifted in a way that
 * mattered: only `/products/[slug]` passed `openGraph.images`, so every other
 * page — the homepage, the catalogue, contact, collections — shared as a bare
 * text link with no picture at all. For a studio whose product *is* the visual,
 * that is the difference between a link someone opens and a link they scroll
 * past.
 *
 * The trap is specific and worth naming, because the obvious fix does not
 * work. Next merges metadata between segments **shallowly**: a page that
 * exports any `openGraph` object replaces the parent layout's `openGraph`
 * wholesale rather than merging into it (see `generate-metadata.md`,
 * "Merging"). So putting a default image in the root layout would have been
 * silently discarded by exactly the ten pages that needed it. The documented
 * remedy is to share the nested fields through a helper — which is this one,
 * with the image supplied by default so a call site cannot forget it.
 *
 * `alternates.languages` is folded in for the same reason: it is derived
 * entirely from `path`, and deriving it in one place is what keeps the hreflang
 * set honest as `indexableLocales` changes.
 */
export function pageSeo({
  locale,
  path,
  title,
  description,
  siteName,
  image,
  hreflangLocales = indexableLocales,
}: PageSeoInput): Pick<Metadata, "alternates" | "openGraph"> {
  const siteUrl = getSiteUrl();
  const canonicalPath = localeHref(locale, path);

  /**
   * `x-default` is the "none of the above matched" fallback — the version
   * Google serves a searcher whose language isn't in the cluster at all. Left
   * out, that searcher gets whichever alternate the algorithm guesses. The
   * store is a Ukrainian workshop selling from Ukraine, so the honest default
   * is the Ukrainian page, i.e. `defaultLocale` — but only when it is actually
   * being advertised, which is exactly the `hreflangLocales` filter the info
   * pages pass. If it isn't, the first advertised locale stands in rather than
   * pointing `x-default` at a page this route doesn't want indexed.
   */
  const xDefaultLocale = hreflangLocales.includes(defaultLocale)
    ? defaultLocale
    : hreflangLocales[0];

  return {
    alternates: {
      canonical: canonicalPath,
      languages: {
        ...Object.fromEntries(
          hreflangLocales.map((altLocale) => [
            altLocale,
            localeHref(altLocale, path),
          ]),
        ),
        ...(xDefaultLocale
          ? { "x-default": localeHref(xDefaultLocale, path) }
          : {}),
      },
    },
    openGraph: {
      title,
      description,
      url: new URL(canonicalPath, siteUrl).toString(),
      siteName,
      locale,
      type: "website",
      images: [
        image
          ? { url: new URL(image, siteUrl).toString() }
          : {
              url: new URL(SHARE_CARD.path, siteUrl).toString(),
              width: SHARE_CARD.width,
              height: SHARE_CARD.height,
            },
      ],
    },
  };
}
