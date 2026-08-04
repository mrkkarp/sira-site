import type { Locale } from "@/i18n/config";

/**
 * Minimal, locale-keyed static strings for Client Components that cannot
 * use `getDictionary` (guarded by `import "server-only"` — see
 * `src/i18n/get-dictionary.ts`). Next.js 16's `not-found.js`/`error.js`
 * special files receive no props (no `params`, no locale), so those pages
 * are Client Components that self-detect the locale from the URL via
 * `usePathname()` and look it up here instead of touching `proxy.ts`.
 *
 * Keep this file tiny and duplication-free from the main dictionaries —
 * it exists only for the handful of screens that render outside normal
 * routing (not-found, error, global-error).
 */
export const clientStrings = {
  uk: {
    siteName: "ODUDLAB",
    notFound: {
      eyebrow: "404",
      title: "Сторінку не знайдено",
      body: "Можливо, її перенесли або видалили. Перевірте адресу чи поверніться на головну.",
      cta: "На головну",
    },
    gone: {
      eyebrow: "410",
      title: "Сторінку видалено назавжди",
      body: "Ця адреса залишилася від старої версії сайту й не має відповідника — товару за нею ніколи не було в нашому каталозі.",
      cta: "Перейти до каталогу",
    },
    error: {
      eyebrow: "Помилка",
      title: "Щось пішло не так",
      body: "Сталася непередбачена помилка. Спробуйте ще раз.",
      retry: "Спробувати ще раз",
      cta: "На головну",
    },
  },
  en: {
    siteName: "ODUDLAB",
    notFound: {
      eyebrow: "404",
      title: "Page not found",
      body: "It may have been moved or removed. Check the address or return to the homepage.",
      cta: "Go home",
    },
    gone: {
      eyebrow: "410",
      title: "This page is gone for good",
      body: "The address is left over from the old version of the site and has no replacement — nothing at it was ever part of our catalogue.",
      cta: "Browse the catalogue",
    },
    error: {
      eyebrow: "Error",
      title: "Something went wrong",
      body: "An unexpected error occurred. Please try again.",
      retry: "Try again",
      cta: "Go home",
    },
  },
  pl: {
    siteName: "ODUDLAB",
    notFound: {
      eyebrow: "404",
      title: "Strony nie znaleziono",
      body: "Mogła zostać przeniesiona lub usunięta. Sprawdź adres lub wróć na stronę główną.",
      cta: "Strona główna",
    },
    gone: {
      eyebrow: "410",
      title: "Strona została trwale usunięta",
      body: "Ten adres pochodzi ze starej wersji serwisu i nie ma odpowiednika — nic pod nim nigdy nie należało do naszego katalogu.",
      cta: "Przejdź do katalogu",
    },
    error: {
      eyebrow: "Błąd",
      title: "Coś poszło nie tak",
      body: "Wystąpił nieoczekiwany błąd. Spróbuj ponownie.",
      retry: "Spróbuj ponownie",
      cta: "Strona główna",
    },
  },
} satisfies Record<Locale, unknown>;

/** Best-effort locale detection from a pathname, for contexts with no `params`. */
export function detectLocaleFromPathname(
  pathname: string,
  locales: readonly Locale[],
  defaultLocale: Locale,
): Locale {
  const [, first] = pathname.split("/");
  return (locales as readonly string[]).includes(first)
    ? (first as Locale)
    : defaultLocale;
}
