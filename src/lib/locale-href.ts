import { defaultLocale, type Locale } from "@/i18n/config";

/**
 * Builds an href for `path` in `locale`. The default locale is unprefixed
 * (`/shop`), every other locale is prefixed (`/en/shop`) — this matches the
 * rewrite rule in `src/proxy.ts`.
 */
export function localeHref(locale: Locale, path: string): string {
  const cleanPath = path === "/" ? "" : path;
  if (locale === defaultLocale) return cleanPath || "/";
  return `/${locale}${cleanPath}`;
}

/**
 * Strips a known locale prefix from a pathname, returning the bare,
 * locale-independent path (e.g. `/en/shop` -> `/shop`).
 */
export function stripLocaleFromPathname(
  pathname: string,
  locales: readonly Locale[],
): string {
  for (const locale of locales) {
    if (pathname === `/${locale}`) return "/";
    if (pathname.startsWith(`/${locale}/`))
      return pathname.slice(locale.length + 1);
  }
  return pathname;
}
