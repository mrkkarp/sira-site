import type { Locale } from "@/i18n/config";
import { clientStrings } from "@/i18n/client-strings";
import { localeHref } from "@/lib/locale-href";
import { renderCrestSvg } from "@/lib/hoopoe-crest";

/**
 * The HTML `src/proxy.ts` serves when it has to answer with a status a page
 * cannot set for itself — `410 Gone` for the old Horoshop demo URLs, `404`
 * for everything no route owns.
 *
 * ## Why the proxy renders its own HTML at all
 *
 * A `page.tsx` can only produce `200` (or `404`, via `notFound()`, and only
 * when nothing has streamed yet). There is a `loading.tsx` at
 * `src/app/[locale]/`, so something always has. The status is therefore the
 * proxy's to set, and setting it means returning a `Response` with a body —
 * there is no way to hand React's rendered tree back with a different number
 * on it.
 *
 * Self-contained on purpose: the proxy has no access to `globals.css` or the
 * `next/font` pipeline, so the colours are inlined from the same design
 * tokens (`--color-background` `#f1eee7`, `--color-text` `#1d1d1b`,
 * `--color-text-muted` `#68655f`) and the type falls back to the system
 * stack. The shape deliberately matches `src/app/not-found.tsx` — crest,
 * eyebrow, heading, one paragraph, one pill link — so the two read as the same
 * page in different fonts rather than as two different sites.
 *
 * ## Why the brand mark is here of all places
 *
 * This is not a rarely-seen file. It is what answers *every* URL no route
 * owns, plus the 44 dead Horoshop demo URLs that still return `410`, which
 * means it is one of the most-served pages on the site and the one people
 * reach when something has already gone wrong. Leaving it as the only
 * unbranded screen would put the site's worst moment in a generic voice.
 *
 * The mark and the accent are inlined as literals (`#b85b42` tips, `#8a8579`
 * shafts, `#9d4832` eyebrow) because there is no stylesheet here to name them
 * with. `#9d4832` is `--brand-accent-ink`, which measures 5.32:1 on this
 * background — the ink and not `--brand-accent`, because this eyebrow is
 * text. The geometry is imported rather than copied so the mark cannot drift
 * away from the one the rest of the site draws.
 *
 * `src/app/not-found.tsx` is *not* dead as a result: it still renders for an
 * explicit `notFound()` thrown inside an already-matched route (an unknown
 * product slug, say), where the status is lost anyway and the full design
 * system is available.
 */
export function renderStatusPage({
  locale,
  eyebrow,
  title,
  body,
  cta,
  ctaPath,
}: {
  locale: Locale;
  eyebrow: string;
  title: string;
  body: string;
  cta: string;
  /** Unprefixed app path (`/`, `/shop`); the locale prefix is added here. */
  ctaPath: string;
}): string {
  const { siteName } = clientStrings[locale];
  return `<!doctype html>
<html lang="${locale}">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<meta name="robots" content="noindex">
<title>${title} — ${siteName}</title>
<style>
:root { color-scheme: light }
body { margin:0; min-height:100vh; display:flex; align-items:center;
  background:#f1eee7; color:#1d1d1b;
  font-family: ui-sans-serif, system-ui, -apple-system, "Segoe UI", sans-serif;
  line-height:1.5 }
main { max-width:38rem; margin:0 auto; padding:6rem 1.5rem }
svg { display:block; margin:0 0 1.25rem }
.eyebrow { margin:0; font-size:.75rem; letter-spacing:.12em; text-transform:uppercase; color:#9d4832 }
h1 { margin:.5rem 0 0; font-size:clamp(1.75rem, 5vw, 2.5rem); font-weight:500; letter-spacing:-.01em }
p.body { margin:.75rem 0 0; color:#68655f }
a { display:inline-block; margin-top:2rem; padding:.75rem 1.5rem;
  border:1px solid #1d1d1b; border-radius:999px; color:#1d1d1b; text-decoration:none }
a:hover { background:#1d1d1b; color:#f1eee7 }
</style>
</head>
<body>
<main>
${renderCrestSvg({ width: 64, shaft: "#8a8579", tip: "#b85b42" })}
<p class="eyebrow">${eyebrow}</p>
<h1>${title}</h1>
<p class="body">${body}</p>
<a href="${localeHref(locale, ctaPath)}">${cta}</a>
</main>
</body>
</html>`;
}

/**
 * The body served with the `404`.
 *
 * Same copy as `src/app/not-found.tsx` — both read `clientStrings[locale]
 * .notFound`, so there is one place to edit the words and no chance of the
 * two 404s saying different things.
 */
export function renderNotFoundPage(locale: Locale): string {
  const { notFound } = clientStrings[locale];
  return renderStatusPage({
    locale,
    eyebrow: notFound.eyebrow,
    title: notFound.title,
    body: notFound.body,
    cta: notFound.cta,
    ctaPath: "/",
  });
}
