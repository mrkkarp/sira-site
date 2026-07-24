import Link from "next/link";
import type { Locale } from "@/i18n/config";
import { localeHref } from "@/lib/locale-href";
import type { NavLink } from "@/config/navigation";

/** Content-sized column of links, used for Collections/Brand/Designers —
 * intentionally not the same width/shape as the 5-column Catalog menu. */
export function SimpleMenuContent({
  locale,
  items,
  labels,
}: {
  locale: Locale;
  items: NavLink[];
  labels: Record<string, string>;
}) {
  return (
    <ul className="flex flex-col gap-(--space-2xs) p-(--space-md)">
      {items.map((item) => (
        <li key={item.href}>
          <Link
            href={localeHref(locale, item.href)}
            className="type-body-sm text-text-muted hover:text-text transition-colors duration-(--duration-fast)"
          >
            {labels[item.labelKey]}
          </Link>
        </li>
      ))}
    </ul>
  );
}
