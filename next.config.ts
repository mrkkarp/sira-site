import type { NextConfig } from "next";
import { withPayload } from "@payloadcms/next/withPayload";

const nextConfig: NextConfig = {
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
    return [
      {
        source: "/:path*",
        headers: [
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
        ],
      },
    ];
  },
};

export default withPayload(nextConfig);
