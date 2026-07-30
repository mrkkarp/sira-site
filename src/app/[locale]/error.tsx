"use client";

import { useEffect } from "react";
import { usePathname } from "next/navigation";
import { defaultLocale, locales } from "@/i18n/config";
import { clientStrings, detectLocaleFromPathname } from "@/i18n/client-strings";
import { localeHref } from "@/lib/locale-href";
import { Button } from "@/components/ui/button";
import { LinkButton } from "@/components/ui/link-button";

/**
 * Route-segment error boundary. Must be a Client Component (React error
 * boundaries can't be Server Components) and, like `not-found.tsx`, gets no
 * `params` — locale is self-detected from the URL. `unstable_retry` is the
 * Next.js 16.2+ recovery hook; falls back to nothing extra since `reset`
 * remains available but `unstable_retry` is now the primary API.
 */
export default function ErrorPage({
  error,
  unstable_retry,
}: {
  error: Error & { digest?: string };
  unstable_retry: () => void;
}) {
  const pathname = usePathname();
  const locale = detectLocaleFromPathname(pathname, locales, defaultLocale);
  const strings = clientStrings[locale];

  useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    <div className="mx-auto flex min-h-[60vh] max-w-2xl flex-col items-start justify-center px-6 py-24">
      <p className="type-eyebrow text-text-muted">{strings.error.eyebrow}</p>
      <h1 className="type-h1 text-text mt-(--space-2xs)">
        {strings.error.title}
      </h1>
      <p className="type-body text-text-muted mt-(--space-2xs)">
        {strings.error.body}
      </p>
      <div className="mt-(--space-sm) flex flex-wrap gap-(--space-xs)">
        <Button type="button" onClick={() => unstable_retry()}>
          {strings.error.retry}
        </Button>
        <LinkButton href={localeHref(locale, "/")} variant="outline">
          {strings.error.cta}
        </LinkButton>
      </div>
    </div>
  );
}
