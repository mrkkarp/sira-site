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
