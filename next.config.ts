import type { NextConfig } from "next";
import { withPayload } from "@payloadcms/next/withPayload";

const nextConfig: NextConfig = {
  // Hand the trailing-slash redirect to `src/proxy.ts`.
  //
  // Next's own runs *before* proxy, which put a `308` in front of every
  // legacy redirect: the old Horoshop URLs all end in a slash, so
  // `/oplata-i-dostavka/` cost `308` → `/oplata-i-dostavka` → `301` →
  // `/payment-delivery`. That is all 162 migrated URLs paying an extra hop,
  // on exactly the requests where the chain matters most. The proxy answers
  // them in one hop instead.
  //
  // This disables the redirect *entirely*, in both directions — the proxy
  // reissues it for live routes (`/shop/` → `308` → `/shop`), which is not
  // optional: without it the site serves every page at two URLs.
  skipTrailingSlashRedirect: true,
  images: {
    // Real product photography, exported from the existing Horoshop catalog
    // (see src/data/products.source.json) — not stock/placeholder imagery.
    remotePatterns: [
      {
        protocol: "https",
        hostname: "odudlab.com",
        pathname: "/content/images/**",
      },
      // Cloudflare R2 public bucket (owner-chosen "Публічний R2 + домен"
      // delivery). Product photography imported by the Horoshop importer now
      // lives in the `odudlab` R2 bucket and is served from this public
      // r2.dev subdomain — the storefront resolves each Payload `Media`
      // document to `${NEXT_PUBLIC_MEDIA_BASE_URL}/<filename>` (see
      // src/lib/payload-flat-products.ts). Kept as an explicit host allowlist
      // rather than a wildcard so only this bucket's CDN can be optimized.
      {
        protocol: "https",
        hostname: "pub-56fa3a7086354b2397e6d9204f7702d5.r2.dev",
        pathname: "/**",
      },
    ],
    // Prompt 9 §5 (performance audit) — prefer AVIF, falling back to Next's
    // default WebP for browsers that don't support it yet.
    //
    // Both formats are kept deliberately, even though every stored format
    // doubles the variant count. Dropping AVIF would *not* halve the bill:
    // almost everything that reaches this site (Chrome, Edge, Firefox, Safari
    // 16.4+) advertises AVIF, so WebP is a small tail, and removing AVIF would
    // move 100% of traffic onto files ~20% larger to delete ~15% of the
    // variants. The levers below cut far more without costing bytes.
    formats: ["image/avif", "image/webp"],

    /**
     * ## Why these two lists are pinned rather than left at the defaults
     *
     * Vercel bills one image transformation per unique
     * `(source, width, quality, format)`. Next builds every `sizes`-bearing
     * image's `srcset` from `imageSizes` concatenated with `deviceSizes` —
     * the *whole* list, every time — so the width lists are a direct
     * multiplier on the bill, and the defaults (7 + 8 = 15 widths) were
     * offering 15 widths × 2 formats = up to 30 variants of all ~152 catalogue
     * photos. That ceiling is several times the monthly allowance, reachable
     * by one thorough crawler without a single human visit.
     *
     * 10 widths instead of 15. Each is here because a real device lands on it:
     * 640 (small phones @2), 828 (the 390–414 pt iPhone bucket @2 — the single
     * most common request on the site), 1080 (360 pt @3, tablets), 1440
     * (laptops @1), 1920 (desktop @1), 2560 (13" retina @2). The small four
     * serve the gallery thumbnail rail and the 40 px colour swatches.
     *
     * 3840 is dropped on purpose, and it is the one real trade. A 1440 pt
     * display at 2× wants 2880 and will now take 2560 and upscale ~12%, which
     * on a photograph is invisible — while a 3840 AVIF encode is the most
     * expensive single transformation this site can ask for, and the hero is
     * the image that asks for it on every home-page visit. Put it back if the
     * quota stops being the binding constraint.
     */
    deviceSizes: [640, 828, 1080, 1440, 1920, 2560],
    imageSizes: [64, 128, 256, 384],

    /**
     * 31 days, up from the Next 16 default of 4 hours.
     *
     * This was the expensive one. The effective TTL is the larger of this
     * value and the upstream `Cache-Control`, and the R2 public bucket
     * sends no `Cache-Control` at all, so the 4-hour floor
     * was the whole policy: every variant expired six times a day and was
     * re-transformed — and re-billed — on the next request. A live check
     * against production found `x-vercel-cache: MISS` on `w=828&q=75` of the
     * flagship product's main photo, which is about the hottest variant the
     * site has and should never miss.
     *
     * Safe to hold this long because these URLs are effectively
     * content-addressed: Payload writes uploads under a hashed filename
     * (`riflo-35691396749621_-faf2ad77d4.jpeg`) and a replaced photo arrives
     * as a new document with a new filename, so a changed image changes its
     * URL rather than reusing a stale cache entry. There is no cache
     * invalidation API for optimized images — if a file ever does need to be
     * swapped in place, re-upload it so it gets a fresh filename.
     */
    minimumCacheTTL: 2678400,
  },
  // Phase J hardening — baseline security response headers, applied site-wide
  // (including the Payload admin UI, which these don't interfere with).
  // Deliberately NOT a full Content-Security-Policy: getting a CSP right
  // without breaking Payload admin's own scripts/styles or Next dev's
  // inline scripts needs real testing against both, which is out of scope
  // for this pass — noted here rather than shipping a broken or "unsafe-*"
  // CSP that gives false confidence.
  async headers() {
    // Only the real production deployment, serving the real domain, may be
    // indexed — and only while the SEO_NOINDEX kill-switch is off. Preview and
    // development deployments (and production during the pre-launch window,
    // while it still answers on *.vercel.app) get a site-wide
    // `X-Robots-Tag: noindex` so Google never indexes staging URLs.
    // This mirrors `isIndexable()` in `src/lib/seo/indexing.ts` — kept as a
    // duplicated env check because next.config is evaluated outside the app's
    // module graph and cannot import from `src/`. A response header is used
    // (not just `<meta robots>`) because it can't be overridden by a page's own
    // generateMetadata, so it also covers explicitly-indexable routes like
    // /contact and product pages.
    //
    // The `NEXT_PUBLIC_SITE_URL` clause is the load-bearing one before
    // cutover. `VERCEL_ENV === "production"` is true of the current
    // `sira-site.vercel.app` deployment, which was therefore serving
    // `index, follow` plus canonicals pointing at itself — an indexable
    // duplicate of the whole shop on a throwaway host. `SEO_NOINDEX` was meant
    // to cover that and was never set, which is the failure mode of any
    // kill-switch whose safe position is "on". Deriving it from the domain the
    // site already claims as its own means the switch cannot be forgotten:
    // while that URL is a *.vercel.app, nothing is indexable.
    const isCanonicalDomain = (() => {
      const siteUrl = process.env.NEXT_PUBLIC_SITE_URL;
      if (!siteUrl) return false;
      try {
        return !new URL(siteUrl).hostname.endsWith(".vercel.app");
      } catch {
        return false;
      }
    })();

    const indexable =
      process.env.SEO_NOINDEX !== "true" &&
      isCanonicalDomain &&
      process.env.VERCEL_ENV === "production";

    const baseHeaders = [
      { key: "X-Content-Type-Options", value: "nosniff" },
      { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
      // SAMEORIGIN rather than DENY: nothing in this app needs to be
      // framed cross-origin, but Payload admin may frame same-origin
      // previews internally.
      { key: "X-Frame-Options", value: "SAMEORIGIN" },
      {
        key: "Permissions-Policy",
        value: "camera=(), microphone=(), geolocation=()",
      },
    ];

    return [
      {
        source: "/:path*",
        headers: indexable
          ? baseHeaders
          : [
              ...baseHeaders,
              { key: "X-Robots-Tag", value: "noindex, nofollow" },
            ],
      },
    ];
  },
};

export default withPayload(nextConfig);
