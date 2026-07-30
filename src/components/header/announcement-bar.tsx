import Link from "next/link";
import type { Locale } from "@/i18n/config";
import type { Dictionary } from "@/i18n/get-dictionary";
import { localeHref } from "@/lib/locale-href";
import { announcementConfig } from "@/config/announcement";

/** Set `announcementConfig.enabled = false` to hide this bar site-wide. */
export function AnnouncementBar({
  locale,
  dictionary,
}: {
  locale: Locale;
  dictionary: Dictionary;
}) {
  if (!announcementConfig.enabled) return null;

  return (
    <div className="bg-text text-background">
      <div className="mx-auto flex h-9 max-w-7xl items-center justify-center gap-(--space-xs) px-6">
        <p className="type-caption truncate">
          <span className="hidden sm:inline">
            {dictionary.announcement.message}
          </span>
          <span className="sm:hidden">
            {dictionary.announcement.messageShort}
          </span>
        </p>
        <Link
          href={localeHref(locale, announcementConfig.href)}
          className="type-caption shrink-0 underline underline-offset-2 hover:no-underline"
        >
          {dictionary.announcement.cta}
        </Link>
      </div>
    </div>
  );
}
