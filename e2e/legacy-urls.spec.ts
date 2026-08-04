import { readFileSync } from "node:fs";
import path from "node:path";
import { test, expect, type APIRequestContext } from "@playwright/test";

/**
 * Every URL the old Horoshop site had indexed, asked for on the wire, in the
 * exact form Google holds it.
 *
 * This is the migration's only end-to-end proof, and the pieces it covers are
 * each guarded in isolation elsewhere — and that is precisely the problem it
 * exists to solve. `gone-paths.test.ts` proves the 410 list is complete
 * against the archived sitemaps. `proxy.test.ts` proves the route mirrors and
 * `redirectToCanonical` are right. Neither can see the thing that actually
 * decides the answer: the *order* of the branches in `src/proxy.ts`, and the
 * `Redirects` rows, which live in the database and can be edited from the
 * admin UI by someone who has never seen this repository.
 *
 * The failure this catches is the expensive one. A 404 on a URL Google has
 * ranked does not look like anything — no error, no log, no broken page. It
 * shows up weeks later as a lost position, and by then the cause is months of
 * commits back. So the assertion is deliberately blunt: for all 184 of them,
 * never a 404, and never more than one hop.
 *
 * The one-hop rule is not tidiness either. `next.config.ts` gives up Next's own
 * trailing-slash redirect (`skipTrailingSlashRedirect: true`) specifically so
 * these can be answered in a single hop — every one of these URLs ends in a
 * slash, so before that change each 301 was riding behind a 308. If a future
 * refactor hands normalisation back to Next, everything here still "works" and
 * this test is the only thing that notices.
 *
 * Source of truth: `_horoshop-export/`, the frozen sitemaps captured from the
 * live old site. Nothing here is typed from memory.
 */

const SITEMAPS = [
  "sitemap-pages.xml",
  "sitemap-brands.xml",
  "sitemap-catalog.xml",
];

/** The old site's canonical origin, as written in its own sitemaps. */
const OLD_ORIGIN = "https://odudlab.com";

const legacyPaths = SITEMAPS.flatMap((file) => {
  const xml = readFileSync(
    path.join(process.cwd(), "_horoshop-export", file),
    "utf8",
  );
  return [...xml.matchAll(/<loc>([^<]+)<\/loc>/g)].map((match) => {
    const url = match[1].trim();
    return url.slice(OLD_ORIGIN.length) || "/";
  });
});

type Hop = { status: number; location: string | null };

/** One request, no following — the status on the wire is the whole point. */
async function hop(request: APIRequestContext, url: string): Promise<Hop> {
  const response = await request.get(url, { maxRedirects: 0 });
  return {
    status: response.status(),
    location: response.headers()["location"] ?? null,
  };
}

/**
 * This file runs in its own `migration` Playwright project, last and on one
 * engine — see the long note beside it in `playwright.config.ts`. It is not
 * merely an optimisation: run alongside the browser specs, the load this
 * sweep puts on the shared dev server and Neon connection pool makes the
 * WebKit cart tests fail.
 */
test.describe("legacy Horoshop URLs", () => {
  /** The sweep runs once; the tests below read its result. */
  let first: Map<string, Hop>;
  let second: Map<string, Hop>;

  /**
   * ~300 requests, and roughly a third of them render a page that `next dev`
   * compiles on first sight, so the default 30s hook budget is not close to
   * enough. Raised rather than worked around: the alternative — sampling the
   * list — would leave exactly the kind of gap this file exists to close.
   */
  test.beforeAll(async ({ playwright, baseURL }, testInfo) => {
    testInfo.setTimeout(300_000);
    const request = await playwright.request.newContext({ baseURL });
    first = new Map();
    second = new Map();

    // Destinations repeat heavily — 100 legacy URLs share ~40 targets, and
    // every `/en/` twin lands beside its Ukrainian original. Asking twice
    // would double the only genuinely expensive part of the sweep.
    const destinations = new Map<string, Hop>();

    for (const legacyPath of legacyPaths) {
      const one = await hop(request, legacyPath);
      first.set(legacyPath, one);
      if (!one.location) continue;

      let target = destinations.get(one.location);
      if (!target) {
        target = await hop(request, one.location);
        destinations.set(one.location, target);
      }
      second.set(legacyPath, target);
    }

    await request.dispose();
  });

  test("the archive still holds every URL the old site had indexed", () => {
    // A guard on the guard: if the export is moved, emptied or half-parsed,
    // every assertion below would pass vacuously over an empty list.
    expect(legacyPaths.length).toBe(184);
    expect(new Set(legacyPaths).size).toBe(184);
  });

  test("not one of them 404s", () => {
    const dead = [...first]
      .filter(([, { status }]) => status === 404)
      .map(([legacyPath]) => legacyPath);
    expect(
      dead,
      `these URLs are indexed by Google today and answer 404 — each is a ` +
        `ranking thrown away silently:\n${dead.join("\n")}`,
    ).toEqual([]);
  });

  test("every one answers 200, 301, 308 or 410 — nothing else", () => {
    const odd = [...first]
      .filter(([, { status }]) => ![200, 301, 308, 410].includes(status))
      .map(([legacyPath, { status }]) => `${legacyPath} → ${status}`);
    expect(odd, `unexpected status:\n${odd.join("\n")}`).toEqual([]);
  });

  test("no redirect chains: every hop lands on a final answer", () => {
    const chained = [...second]
      .filter(([, { status }]) => status >= 300 && status < 400)
      .map(([legacyPath, { status, location }]) => {
        const via = first.get(legacyPath);
        return `${legacyPath} → ${via?.status} → ${via?.location} → ${status} → ${location}`;
      });
    expect(
      chained,
      `these pay two or more hops. \`skipTrailingSlashRedirect\` in ` +
        `next.config.ts exists to make this list empty:\n${chained.join("\n")}`,
    ).toEqual([]);
  });

  test("every redirect lands on a page that exists", () => {
    // A 301 into a 404 is worse than the 404 alone: it spends the link equity
    // on the way to nowhere, and reads to Google as a soft 404.
    const broken = [...second]
      .filter(([, { status }]) => status !== 200 && status !== 410)
      .map(
        ([legacyPath, { status }]) =>
          `${legacyPath} → ${first.get(legacyPath)?.location} → ${status}`,
      );
    expect(
      broken,
      `redirect target is not a page:\n${broken.join("\n")}`,
    ).toEqual([]);
  });

  /**
   * The shape of the migration, asserted as a whole. The individual rules above
   * would all still pass if, say, the entire redirect map were replaced by 410s
   * — every URL would answer, none would 404, none would chain, and 100 real
   * pages of ranking history would be thrown away. This is the assertion that
   * says what the answers are *supposed* to be.
   */
  test("the migration keeps its shape: 100 redirected, 68 gone, 16 served", () => {
    const tally = { redirected: 0, gone: 0, served: 0 };
    for (const { status } of first.values()) {
      if (status === 301) tally.redirected++;
      else if (status === 410) tally.gone++;
      else if (status === 308 || status === 200) tally.served++;
    }
    // 100 = the real Horoshop pages and products that moved to a new address.
    // 68  = the demo-template categories and brands (34 paths × uk/en), which
    //       never had anything of ours behind them (see src/lib/gone-paths.ts).
    // 16  = the category slugs deliberately kept as-is because they carry
    //       history — including all five Google Ads landing pages — plus the
    //       homepage. These 308 only to drop the trailing slash.
    expect(tally).toEqual({ redirected: 100, gone: 68, served: 16 });
  });

  /**
   * The five URLs with live ads pointing at them. They are in the sweep above
   * already, but a generic "did not 404" is too weak a statement about the
   * pages that paid traffic lands on: these must reach a real category page,
   * and the brief forbids changing their addresses without warning.
   */
  const adLandingPages = [
    "/rakovyny/",
    "/vazony/",
    "/vulychni-mebli/",
    "/stolyky/",
    "/paneli/",
  ];

  test.describe("Google Ads landing pages", () => {
    for (const adPath of adLandingPages) {
      test(`${adPath} reaches its category in one hop`, () => {
        const one = first.get(adPath);
        expect(
          one,
          `${adPath} is missing from the archived sitemaps`,
        ).toBeDefined();
        expect(one?.status, `${adPath} must not 404 or 410`).toBe(308);
        expect(one?.location).toBe(adPath.replace(/\/$/, ""));
        expect(second.get(adPath)?.status).toBe(200);
      });
    }
  });
});
