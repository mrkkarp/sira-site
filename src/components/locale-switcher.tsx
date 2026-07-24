"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { locales, localeLabels, type Locale } from "@/i18n/config";
import { localeHref, stripLocaleFromPathname } from "@/lib/locale-href";

export function LocaleSwitcher({ locale }: { locale: Locale }) {
  const pathname = usePathname();
  const bare = stripLocaleFromPathname(pathname, locales);

  return (
    <ul className="type-label flex items-center gap-2">
      {locales.map((candidate) => (
        <li key={candidate}>
          <Link
            href={localeHref(candidate, bare)}
            aria-current={candidate === locale ? "true" : undefined}
            title={localeLabels[candidate]}
            className={
              candidate === locale
                ? "font-medium"
                : "opacity-60 transition-opacity duration-(--duration-fast) hover:opacity-100"
            }
          >
            {candidate}
          </Link>
        </li>
      ))}
    </ul>
  );
}
