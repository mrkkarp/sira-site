import type { MetadataRoute } from "next";
import { getSiteUrl } from "@/lib/site-url";

/**
 * `robots.txt` (Prompt 9 §4). `/admin` (Payload) and `/api/*` are the only
 * hard `Disallow`s — every other noindex decision (placeholder pages,
 * cart/checkout/order-status/search) is already expressed per-route via
 * `robots: { index: false }` in each page's own `generateMetadata`
 * (see `src/lib/seo/placeholder-metadata.ts`), which is the correct place
 * for it: a `Disallow` here would stop crawlers from ever reading those
 * pages' `noindex` meta tag, and (for `/search`) would also block the
 * query-string-driven URLs the header search drawer's "view all results"
 * link depends on being crawlable-but-not-indexed.
 */
export default function robots(): MetadataRoute.Robots {
  const siteUrl = getSiteUrl();
  return {
    rules: {
      userAgent: "*",
      allow: "/",
      disallow: ["/admin", "/api/"],
    },
    sitemap: new URL("/sitemap.xml", siteUrl).toString(),
  };
}
