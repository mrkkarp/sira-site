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
    formats: ["image/avif", "image/webp"],
  },
  // Phase J hardening — baseline security response headers, applied site-wide
  // (including the Payload admin UI, which these don't interfere with).
  // Deliberately NOT a full Content-Security-Policy: getting a CSP right
  // without breaking Payload admin's own scripts/styles or Next dev's
  // inline scripts needs real testing against both, which is out of scope
  // for this pass — noted here rather than shipping a broken or "unsafe-*"
  // CSP that gives false confidence.
  async headers() {
    // Only the real production deployment may be indexed, and only while the
    // SEO_NOINDEX kill-switch is off. Preview/development deployments (and the
    // production deployment during the pre-launch window) get a site-wide
    // `X-Robots-Tag: noindex` so Google never indexes staging/vercel.app URLs.
    // This mirrors `isIndexable()` in `src/lib/seo/indexing.ts` — kept as a
    // duplicated one-line env check because next.config is evaluated outside
    // the app's module graph and cannot import from `src/`. A response header
    // is used (not just `<meta robots>`) because it can't be overridden by a
    // page's own generateMetadata, so it also covers explicitly-indexable
    // routes like /contact and product pages.
    const indexable =
      process.env.SEO_NOINDEX !== "true" &&
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
