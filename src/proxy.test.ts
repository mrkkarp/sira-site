import { readdirSync } from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";
import { KNOWN_TOP_LEVEL_SEGMENTS } from "./proxy";
import { defaultLocale, locales } from "@/i18n/config";

/**
 * `KNOWN_TOP_LEVEL_SEGMENTS` in `src/proxy.ts` is a hand-written mirror of the
 * route folders under `src/app/[locale]/`. Nothing kept the two in sync, and
 * the failure it allows is not cosmetic:
 *
 * The proxy only consults the `Redirects` collection for paths whose first
 * segment is NOT in that set. So a route folder that exists on disk but is
 * missing from the set becomes eligible for legacy-redirect matching — and if
 * a row happens to share its name (82 legacy Horoshop aliases are live today,
 * all bare single segments like `/riflo`, `/volcano`), the brand-new page is
 * permanently 301'd away to an old URL and is simply unreachable. The reverse
 * drift is milder but still wrong: a segment listed here with no folder behind
 * it silently disables redirects for that path.
 *
 * This test makes the mirror self-enforcing, so adding a route folder without
 * touching the proxy fails here rather than in production.
 */
describe("proxy route segments", () => {
  const localeRouteDir = path.join(process.cwd(), "src/app/[locale]");

  /** Route folders = real URL segments. Files (`page.tsx`, `layout.tsx`, …)
   * and Next's grouping/private conventions (`(group)`, `_internal`,
   * `[dynamic]`) are not fixed top-level segments and are excluded. */
  const routeFolders = readdirSync(localeRouteDir, { withFileTypes: true })
    .filter((entry) => entry.isDirectory())
    .map((entry) => entry.name)
    .filter(
      (name) =>
        !name.startsWith("(") && !name.startsWith("_") && !name.startsWith("["),
    );

  /** Roots that live outside `[locale]` and are handled by the proxy directly. */
  const nonLocalisedRoots = ["admin", "api", "design-system"];

  /** Locales other than the default one are real URL prefixes; the default
   * locale is not prefixed (`/shop`, never `/uk/shop`). */
  const prefixedLocales = locales.filter((locale) => locale !== defaultLocale);

  it("covers every route folder under src/app/[locale]/", () => {
    expect(routeFolders.length).toBeGreaterThan(0);
    const missing = routeFolders.filter(
      (segment) => !KNOWN_TOP_LEVEL_SEGMENTS.has(segment),
    );
    expect(
      missing,
      `route folder(s) exist but are missing from KNOWN_TOP_LEVEL_SEGMENTS in ` +
        `src/proxy.ts — a legacy redirect row with the same name would shadow ` +
        `the page entirely: ${missing.join(", ")}`,
    ).toEqual([]);
  });

  it("has no segment that no longer maps to a route", () => {
    const expected = new Set([
      ...routeFolders,
      ...nonLocalisedRoots,
      ...prefixedLocales,
    ]);
    const stale = [...KNOWN_TOP_LEVEL_SEGMENTS].filter(
      (segment) => !expected.has(segment),
    );
    expect(
      stale,
      `KNOWN_TOP_LEVEL_SEGMENTS lists segment(s) with no route behind them, ` +
        `which silently disables legacy redirects for those paths: ${stale.join(", ")}`,
    ).toEqual([]);
  });

  it("does not list the default locale, which is never a URL prefix", () => {
    expect(KNOWN_TOP_LEVEL_SEGMENTS.has(defaultLocale)).toBe(false);
  });
});
