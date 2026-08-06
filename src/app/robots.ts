import type { MetadataRoute } from "next";
import { getSiteUrl } from "@/lib/site-url";

/**
 * `robots.txt` (Prompt 9 §4). `/admin` (Payload) and `/api/*` are the only
 * hard `Disallow`s for content — every other noindex decision (placeholder
 * pages, cart/checkout/order-status/search) is already expressed per-route via
 * `robots: { index: false }` in each page's own `generateMetadata`
 * (see `src/lib/seo/placeholder-metadata.ts`), which is the correct place
 * for it: a `Disallow` here would stop crawlers from ever reading those
 * pages' `noindex` meta tag, and (for `/search`) would also block the
 * query-string-driven URLs the header search drawer's "view all results"
 * link depends on being crawlable-but-not-indexed.
 *
 * ## Why `/_next/image` is closed to everything except the search engines
 *
 * That path is metered. Vercel bills one image transformation per unique
 * `(source, width, quality, format)`, and Next publishes every candidate width
 * in each image's `srcset` — so anything that walks a `srcset` instead of
 * picking one entry from it can mint the entire matrix. Across the catalogue
 * that is thousands of billable variants, several times the monthly
 * allowance, produced without a single human visit. This is not hypothetical
 * spend: the quota was nearly exhausted, which is what prompted the whole
 * change (see the image notes in `next.config.ts` for the other two causes).
 *
 * Crawlers that send a wildcard `Accept` header make it worse than the
 * arithmetic suggests — they opt out of the AVIF/WebP negotiation and mint a
 * *third* variant of each width in the source format.
 *
 * So the named search engines keep full access and everything else loses this
 * one path. They are named individually rather than by any pattern, because
 * each earns it differently:
 *
 * - `Googlebot` renders the page to judge layout and Core Web Vitals, and a
 *   product page whose photographs fail to load is a page it will judge badly.
 * - `Googlebot-Image` is the one that puts the catalogue into Google Images.
 * - `Google-InspectionTool` is what Search Console's "Test live URL" runs. It
 *   is negligible traffic, but blocking it would render the owner a screenshot
 *   full of broken photographs and a diagnosis of a problem that isn't real.
 * - `Storebot-Google` crawls product pages for shopping surfaces.
 * - `Bingbot` for the same reasons as `Googlebot`, at a smaller scale.
 *
 * `AdsBot-Google` is deliberately absent: it ignores the wildcard group
 * entirely by design, so the campaigns' landing-page checks are unaffected
 * without naming it. Link previews are unaffected too — `og:image` points
 * straight at the R2 public bucket rather than through the optimizer.
 *
 * Each named group repeats the content `Disallow`s on purpose. A crawler obeys
 * the single most specific group that matches it and ignores every other, so
 * omitting them here would hand Googlebot `/admin`.
 */
const CONTENT_DISALLOW = ["/admin", "/api/"];

const IMAGE_OPTIMIZER_ALLOWED = [
  "Googlebot",
  "Googlebot-Image",
  "Google-InspectionTool",
  "Storebot-Google",
  "Bingbot",
];

export default function robots(): MetadataRoute.Robots {
  const siteUrl = getSiteUrl();
  return {
    rules: [
      {
        userAgent: IMAGE_OPTIMIZER_ALLOWED,
        allow: "/",
        disallow: CONTENT_DISALLOW,
      },
      {
        userAgent: "*",
        allow: "/",
        disallow: [...CONTENT_DISALLOW, "/_next/image"],
      },
    ],
    sitemap: new URL("/sitemap.xml", siteUrl).toString(),
  };
}
