"use client";

import "./globals.css";
import { usePathname } from "next/navigation";
import { Manrope, Instrument_Serif } from "next/font/google";
import { defaultLocale, locales } from "@/i18n/config";
import { clientStrings, detectLocaleFromPathname } from "@/i18n/client-strings";
import { localeHref } from "@/lib/locale-href";
import { LinkButton } from "@/components/ui/link-button";
import { BrandEyebrow, HoopoeCrest } from "@/components/brand";

const interfaceSans = Manrope({
  variable: "--font-interface-sans",
  subsets: ["latin", "cyrillic"],
});

const editorialSerif = Instrument_Serif({
  variable: "--font-editorial-serif",
  subsets: ["latin"],
  weight: "400",
  style: ["normal", "italic"],
});

/**
 * Root-level 404. There is no shared root layout in this project
 * (`[locale]/layout.tsx` and `design-system/layout.tsx` are independent
 * parallel roots — see AGENTS.md/README), so this file defines its own
 * complete `<html>/<body>` and imports globals.css directly.
 *
 * Prompt 9 §9/§10 (e2e audit) — this Next.js version's `not-found.js`
 * convention routes *every* genuinely-unmatched URL (no matching route at
 * all, not just an explicit `notFound()` call) to this ROOT file, even
 * under a `/en`/`/pl` prefix — the nested `[locale]/not-found.tsx` only
 * fires for an explicit `notFound()` thrown from within an already-matched
 * route (e.g. an invalid product slug). A bare `/en/typo-url` was
 * incorrectly rendering the hardcoded `uk` copy with `lang="uk"` until this
 * fix — self-detect the locale from the URL here too, the same way the
 * nested 404 already does, so a genuinely-unmatched `/en/...`/`/pl/...`
 * path gets the correct language and `lang` attribute.
 */
export default function RootNotFound() {
  const pathname = usePathname();
  const locale = detectLocaleFromPathname(pathname, locales, defaultLocale);
  const strings = clientStrings[locale];

  return (
    <html
      lang={locale}
      className={`${interfaceSans.variable} ${editorialSerif.variable}`}
    >
      <body className="bg-background text-text flex min-h-screen flex-col font-sans antialiased">
        <div className="mx-auto flex min-h-[60vh] max-w-2xl flex-1 flex-col items-start justify-center px-6 py-24">
          {/* Same treatment as the nested 404, and for a stronger reason: per
              the note above, *this* is the file a mistyped URL actually lands
              on. The nested one only fires for an explicit `notFound()`. If
              only one of the two carried the mark it should have been this
              one — so they are kept identical deliberately, not by accident. */}
          <HoopoeCrest size="lg" className="mb-(--space-sm)" />
          <BrandEyebrow>{strings.notFound.eyebrow}</BrandEyebrow>
          <h1 className="type-h1 text-text mt-(--space-2xs)">
            {strings.notFound.title}
          </h1>
          <p className="type-body text-text-muted mt-(--space-2xs)">
            {strings.notFound.body}
          </p>
          <LinkButton
            href={localeHref(locale, "/")}
            className="mt-(--space-sm)"
          >
            {strings.notFound.cta}
          </LinkButton>
        </div>
      </body>
    </html>
  );
}
