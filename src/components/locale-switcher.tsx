"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { locales, localeLabels, type Locale } from "@/i18n/config";
import { localeHref, stripLocaleFromPathname } from "@/lib/locale-href";

export function LocaleSwitcher({ locale }: { locale: Locale }) {
  const pathname = usePathname();
  const bare = stripLocaleFromPathname(pathname, locales);

  return (
    <ul className="flex items-center gap-2 text-xs tracking-wide uppercase">
      {locales.map((candidate) => (
        <li key={candidate}>
          <Link
            href={localeHref(candidate, bare)}
            aria-current={candidate === locale ? "true" : undefined}
            title={localeLabels[candidate]}
            className={
              candidate === locale
                ? "text-ink font-medium"
                : "text-ink-muted hover:text-ink"
            }
          >
            {candidate}
          </Link>
        </li>
      ))}
    </ul>
  );
}
