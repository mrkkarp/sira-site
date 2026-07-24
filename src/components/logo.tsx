import Link from "next/link";
import type { Locale } from "@/i18n/config";
import { localeHref } from "@/lib/locale-href";

export function Logo({ locale }: { locale: Locale }) {
  return (
    <Link
      href={localeHref(locale, "/")}
      className="text-text font-serif text-xl tracking-tight"
      aria-label="ODUDLAB — home"
    >
      ODUDLAB
    </Link>
  );
}
