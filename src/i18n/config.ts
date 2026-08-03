export const locales = ["uk", "en", "pl"] as const;

export type Locale = (typeof locales)[number];

export const defaultLocale: Locale = "uk";

export function isLocale(value: string): value is Locale {
  return (locales as readonly string[]).includes(value);
}

export const localeLabels: Record<Locale, string> = {
  uk: "Українська",
  en: "English",
  pl: "Polski",
};

/**
 * The two letters a language switcher prints — which are NOT the locale codes
 * above.
 *
 * `uk` is the ISO 639-1 code for Ukrainian and has to stay `uk` everywhere it
 * is machine-read: the route segment, `<html lang>`, `hreflang`, the sitemap's
 * alternates, Open Graph. Changing it would be an SEO regression, not a
 * translation.
 *
 * Printed at a visitor, though, "UK" is the United Kingdom — the switcher was
 * offering a British flag's worth of confusion next to EN and PL, which are
 * read as countries too. So the *label* is the country code `UA` while the
 * *code* stays `uk`. The other two happen to coincide with their ISO codes;
 * they are written out here anyway so the switcher has one map to read and
 * nobody has to remember which of the three is special.
 */
export const localeCodeLabels: Record<Locale, string> = {
  uk: "UA",
  en: "EN",
  pl: "PL",
};
