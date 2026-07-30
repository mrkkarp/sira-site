import { isLocale, defaultLocale, type Locale } from "@/i18n/config";

/**
 * Derives the submitting page's locale and `sourcePath` from the request's
 * `Referer` header, instead of threading a `locale`/`path` prop through
 * every form component that could conceivably appear on any page (the
 * footer forms render on every route). `sourcePath` is deliberately just
 * the pathname — never the query string — so tracking params never end
 * up stored (Prompt 8 §8/§12, matches the `sourcePath` doc comment on
 * `leadCommonFields`).
 */
export function localeAndSourcePathFromReferer(refererHeader: string | null): {
  locale: Locale;
  sourcePath?: string;
} {
  if (!refererHeader) return { locale: defaultLocale };

  let pathname: string;
  try {
    pathname = new URL(refererHeader).pathname;
  } catch {
    return { locale: defaultLocale };
  }

  const segments = pathname.split("/").filter(Boolean);
  const maybeLocale = segments[0];
  if (maybeLocale && isLocale(maybeLocale)) {
    const rest = segments.slice(1).join("/");
    return { locale: maybeLocale, sourcePath: rest ? `/${rest}` : "/" };
  }
  return { locale: defaultLocale, sourcePath: pathname || "/" };
}
