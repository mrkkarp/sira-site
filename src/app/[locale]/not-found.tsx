"use client";

import { usePathname } from "next/navigation";
import { defaultLocale, locales } from "@/i18n/config";
import { clientStrings, detectLocaleFromPathname } from "@/i18n/client-strings";
import { localeHref } from "@/lib/locale-href";
import { LinkButton } from "@/components/ui/link-button";

/**
 * `not-found.js` receives no props in Next.js 16 (confirmed via
 * node_modules/next/dist/docs) — even nested under `[locale]`, it cannot
 * read `params.locale`. Self-detects the locale from the URL instead, and
 * uses the small `client-strings` module (not the "server-only" dictionary
 * loader) since this must be a Client Component to call `usePathname`.
 */
export default function NotFound() {
  const pathname = usePathname();
  const locale = detectLocaleFromPathname(pathname, locales, defaultLocale);
  const strings = clientStrings[locale];

  return (
    <div className="mx-auto flex min-h-[60vh] max-w-2xl flex-col items-start justify-center px-6 py-24">
      <p className="type-eyebrow text-text-muted">{strings.notFound.eyebrow}</p>
      <h1 className="type-h1 text-text mt-(--space-2xs)">
        {strings.notFound.title}
      </h1>
      <p className="type-body text-text-muted mt-(--space-2xs)">
        {strings.notFound.body}
      </p>
      <LinkButton href={localeHref(locale, "/")} className="mt-(--space-sm)">
        {strings.notFound.cta}
      </LinkButton>
    </div>
  );
}
