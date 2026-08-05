import { describe, expect, it } from "vitest";
import legacyUrlInventory from "@/data/legacy-url-inventory.json";
import {
  LEGACY_URL_MAP,
  findStaticLegacyRedirect,
  normaliseLegacyPath,
} from "./legacy-url-map";
import { isServedPath } from "@/proxy";
import { GONE_PATHS } from "./gone-paths";

/**
 * `legacy-url-inventory.json` is the evidence, frozen.
 *
 * It is the 490 addresses that were walked out of the Wayback CDX index for
 * `odudlab.com*` and then replayed against production — every one of which
 * answered `404` at the time of the audit. Checked in rather than re-fetched
 * because the old server is being decommissioned and `web.archive.org` is not
 * a dependency a test suite should have; and kept in its raw form, trailing
 * slashes and `/ru/` prefixes intact, because normalising it before saving
 * would quietly test the map against the map's own assumptions.
 */
const inventory = legacyUrlInventory as string[];

/** What the proxy passes in: locale prefix stripped, trailing slash stripped. */
function toBarePath(url: string): string {
  const withoutLocale = url.replace(/^\/(en|pl)(?=\/|$)/, "");
  return withoutLocale.replace(/\/+$/, "") || "/";
}

describe("normaliseLegacyPath", () => {
  it("strips the /ru locale the site never had", () => {
    expect(normaliseLegacyPath("/ru/kategoriya/umyvalnuku")).toBe(
      "/kategoriya/umyvalnuku",
    );
    expect(normaliseLegacyPath("/ru")).toBe("/");
  });

  it("collapses WordPress archive pagination", () => {
    // Page 3 of a category that no longer exists is the same answer as page 1.
    expect(normaliseLegacyPath("/kategoriya/vazony/page/3")).toBe(
      "/kategoriya/vazony",
    );
  });

  it("strips a trailing /feed but never reduces /feed itself away", () => {
    expect(normaliseLegacyPath("/kategoriya/vazony/feed")).toBe(
      "/kategoriya/vazony",
    );
    // The bug this guards: `replace(/\/feed$/)` turns "/feed" into "" and then
    // into "/", which stops being a legacy path and starts being the homepage.
    expect(normaliseLegacyPath("/feed")).toBe("/feed");
  });

  it("leaves an ordinary path untouched", () => {
    expect(normaliseLegacyPath("/katalog/tower")).toBe("/katalog/tower");
  });
});

describe("findStaticLegacyRedirect", () => {
  it("answers every measured 404 from the audit", () => {
    // The whole point of the file. A miss here is a URL that is indexed,
    // linked, still clicked, and lands on a dead end.
    //
    // Minus the live twins: `/ru/` normalises to `/`, `/ru/rakovyny` to
    // `/rakovyny`, and those are pages, not legacy addresses. The proxy
    // answers them by redirecting to the normalised path directly — this
    // function deliberately has nothing to say about them, because a rule
    // keyed on a live page is exactly the mistake the last test in this file
    // guards against.
    const unanswered = inventory.filter((url) => {
      const bare = toBarePath(url);
      const normalised = normaliseLegacyPath(bare);
      if (
        normalised !== bare &&
        isServedPath(normalised.split("/").filter(Boolean))
      ) {
        return false;
      }
      return findStaticLegacyRedirect(bare) === null;
    });
    expect(
      unanswered,
      `legacy URL(s) with no rule: ${unanswered.slice(0, 20).join(", ")}`,
    ).toEqual([]);
  });

  it("leaves the /ru twin of a live page to the proxy", () => {
    // Not a legacy address at all — `/ru/rakovyny` is the category, spelled
    // with a locale this site does not have. The proxy 301s it to
    // `/rakovyny`; this map must stay silent so that the fossil
    // `/rakovyny → /shop/sinks` row cannot be reached either.
    expect(findStaticLegacyRedirect("/ru/rakovyny")).toBeNull();
    expect(findStaticLegacyRedirect("/ru")).toBeNull();
  });

  it("resolves a /ru twin through its Ukrainian entry", () => {
    // 193 of the 490 are Russian. They cost one rule, not 193.
    expect(
      findStaticLegacyRedirect("/ru/katalog/rakovina-betonnaya-tower"),
    ).toBe(findStaticLegacyRedirect("/katalog/rakovina-betonnaya-tower"));
  });

  it("prefers the entry that knows the product over the namespace rule", () => {
    // `/katalog/` has a `→ /shop` safety net under it. It must never win
    // against a rule that can name the actual successor page.
    expect(findStaticLegacyRedirect("/katalog/rakovina-betonnaya-tower")).toBe(
      "/products/tower",
    );
    expect(findStaticLegacyRedirect("/katalog/never-crawled-slug")).toBe(
      "/shop",
    );
  });

  it("covers the faceted-filter namespaces beyond what was crawled", () => {
    // The reason these are prefixes and not rows: the combinations compose
    // freely, so an enumerated list can only ever be a sample of them.
    expect(findStaticLegacyRedirect("/price/3000-7000")).toBe("/shop");
    expect(findStaticLegacyRedirect("/tsvet/ral-9016")).toBe("/shop");
    expect(findStaticLegacyRedirect("/ves/gt-50-kg")).toBe("/shop");
  });

  it("says nothing about paths that are not legacy addresses", () => {
    expect(findStaticLegacyRedirect("/definitely-not-an-old-url")).toBeNull();
    expect(findStaticLegacyRedirect("/rakovyny")).toBeNull();
  });
});

describe("LEGACY_URL_MAP", () => {
  const targets = [...new Set(LEGACY_URL_MAP.values())];

  it("only points at pages this site actually serves", () => {
    // The failure this exists to prevent, and it is not hypothetical: the
    // `Redirects` collection carried `/vulychni → /shop/outdoor` for weeks
    // after `/shop/outdoor` stopped existing — a live 301 into a 404. A map
    // in code can be held to the routing table; a database row cannot.
    const dead = targets.filter(
      (target) =>
        !isServedPath(target.split("?")[0].split("/").filter(Boolean)),
    );
    expect(dead, `target(s) no route serves: ${dead.join(", ")}`).toEqual([]);
  });

  it("never redirects into another redirect", () => {
    // A chain costs a hop and, worse, is a place a future edit can break the
    // link between the old URL and the page that replaced it.
    const chained = targets.filter((target) => LEGACY_URL_MAP.has(target));
    expect(chained, `target(s) that are themselves keys: ${chained}`).toEqual(
      [],
    );
  });

  it("never redirects to a path the proxy answers with 410", () => {
    // `isGonePath` runs *before* the lookup, so a 301 pointing at one would
    // be a redirect into a tombstone.
    const buried = targets.filter((target) => GONE_PATHS.has(target));
    expect(buried, `target(s) in GONE_PATHS: ${buried}`).toEqual([]);
  });

  it("is keyed on already-normalised paths", () => {
    // A key with a trailing slash, a `/ru` prefix or a `/page/2` suffix is
    // dead weight — `findStaticLegacyRedirect` normalises before it looks up,
    // so such a key could never be hit.
    const unreachable = [...LEGACY_URL_MAP.keys()].filter(
      (key) => normaliseLegacyPath(key) !== key,
    );
    expect(unreachable, `unreachable key(s): ${unreachable}`).toEqual([]);
  });

  it("does not shadow a path the site serves for real", () => {
    // The `/rakovyny → /shop/sinks` mistake in reverse: a rule whose *key* is
    // a live page would redirect that page away from itself.
    const shadowed = [...LEGACY_URL_MAP.keys()].filter((key) =>
      isServedPath(key.split("/").filter(Boolean)),
    );
    expect(shadowed, `key(s) that are live pages: ${shadowed}`).toEqual([]);
  });
});
