import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { defaultLocale, locales } from "@/i18n/config";
import { findLegacyRedirect } from "@/lib/legacy-redirects";

const prefixedLocales = locales.filter((locale) => locale !== defaultLocale);

// Every first path segment a *current* route actually owns — mirrors the
// directory names under src/app/[locale]/ plus the non-localised
// admin/design-system/api roots. Prompt 9 §3: legacy Horoshop URLs (old
// product/category aliases, /pro-nas, /oplata-i-dostavka, etc.) are all
// single unprefixed segments that never collide with this list, so the
// Redirects-collection lookup below only runs for paths that AREN'T one
// of these — real traffic (shop, products, cart, ...) never pays for the
// extra DB round-trip, only genuinely-unrecognised paths do.
const KNOWN_TOP_LEVEL_SEGMENTS = new Set([
  ...prefixedLocales,
  "admin",
  "api",
  "design-system",
  "about",
  "care",
  "careers",
  "cart",
  "checkout",
  "collections",
  "colours",
  "contact",
  "cookies-policy",
  "designers",
  "faq",
  "order-status",
  "payment-delivery",
  "privacy-policy",
  "products",
  "projects",
  "public-offer",
  "resources",
  "returns",
  "samples",
  "search",
  "shop",
  "terms-of-use",
  "warranty",
]);

export async function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // Dev-only tooling route — not part of the localised site, never rewritten.
  if (pathname === "/design-system" || pathname.startsWith("/design-system/")) {
    return NextResponse.next();
  }

  // Admin panel — its own root layout with Payload's own uk/en/pl
  // localization, never part of the public site's locale rewriting.
  if (pathname === "/admin" || pathname.startsWith("/admin/")) {
    return NextResponse.next();
  }

  const firstSegment = pathname.split("/").find(Boolean);
  if (firstSegment && !KNOWN_TOP_LEVEL_SEGMENTS.has(firstSegment)) {
    const legacyRedirect = await findLegacyRedirect(pathname);
    if (legacyRedirect) {
      return NextResponse.redirect(
        new URL(legacyRedirect.toPath, request.url),
        legacyRedirect.statusCode,
      );
    }
  }

  const hasLocalePrefix = prefixedLocales.some(
    (locale) => pathname === `/${locale}` || pathname.startsWith(`/${locale}/`),
  );

  if (hasLocalePrefix) {
    return NextResponse.next();
  }

  const url = request.nextUrl.clone();
  url.pathname = `/${defaultLocale}${pathname}`;
  return NextResponse.rewrite(url);
}

export const config = {
  matcher: [
    "/((?!api|_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|webp|avif|ico|txt|xml)$).*)",
  ],
};
