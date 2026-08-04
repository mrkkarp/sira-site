"use client";

import { useEffect } from "react";
import { Manrope, Instrument_Serif } from "next/font/google";
import "./globals.css";
import { clientStrings } from "@/i18n/client-strings";
import { Button } from "@/components/ui/button";

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
 * Root error boundary — catches errors thrown in `[locale]/layout.tsx`
 * itself (below-layout errors are caught by `[locale]/error.tsx` instead).
 * Must define its own `<html>/<body>` (replaces the root layout when
 * active) and cannot export `metadata`/`generateMetadata`. No `params` are
 * available here either, so this always renders the default-locale copy.
 */
export default function GlobalError({
  error,
  unstable_retry,
}: {
  error: Error & { digest?: string };
  unstable_retry: () => void;
}) {
  const strings = clientStrings.uk;

  useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    <html
      lang="uk"
      className={`${interfaceSans.variable} ${editorialSerif.variable}`}
    >
      <body className="bg-background text-text flex min-h-screen flex-col font-sans antialiased">
        <div className="mx-auto flex min-h-[60vh] max-w-2xl flex-1 flex-col items-start justify-center px-6 py-24">
          <p className="type-eyebrow text-text-muted">
            {strings.error.eyebrow}
          </p>
          <h1 className="type-h1 text-text mt-(--space-2xs)">
            {strings.error.title}
          </h1>
          <p className="type-body text-text-muted mt-(--space-2xs)">
            {strings.error.body}
          </p>
          <Button
            type="button"
            onClick={() => unstable_retry()}
            className="mt-(--space-sm)"
          >
            {strings.error.retry}
          </Button>
        </div>
      </body>
    </html>
  );
}
