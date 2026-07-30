import Link from "next/link";
import type { Locale } from "@/i18n/config";
import type { Dictionary } from "@/i18n/get-dictionary";
import { localeHref } from "@/lib/locale-href";
import { primaryNav } from "@/config/navigation";

/**
 * Plain-link fallback for the main navigation when JavaScript is
 * unavailable — the real header's mega-menu/mobile-menu are both
 * interactive (`"use client"`) and hidden without JS via `<noscript>`
 * CSS reset, so this ensures every top-level destination stays reachable.
 */
export function NoScriptNav({
  locale,
  dictionary,
}: {
  locale: Locale;
  dictionary: Dictionary;
}) {
  return (
    <noscript>
      <nav aria-label={dictionary.footerNav.mainNavHeading}>
        <ul
          style={{
            display: "flex",
            flexWrap: "wrap",
            gap: "1rem",
            listStyle: "none",
            margin: 0,
            padding: "0.75rem 1.5rem",
            background: "var(--color-surface)",
            borderBottom: "1px solid var(--color-border)",
          }}
        >
          {primaryNav.map((item) => (
            <li key={item.key}>
              <Link href={localeHref(locale, item.href)}>
                {dictionary.nav[item.key as keyof typeof dictionary.nav]}
              </Link>
            </li>
          ))}
        </ul>
      </nav>
    </noscript>
  );
}
