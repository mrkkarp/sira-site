import "server-only";
import { getPayloadClient } from "@/lib/payload-client";

/**
 * Legacy-URL redirect lookup (Prompt 9 §3 — legacy migration audit).
 *
 * The `Redirects` collection (`src/collections/Redirects.ts`) has existed
 * since Phase B and is populated by the Horoshop importer
 * (`horoshop-import-service.ts`, one row per product's old `alias`) plus
 * any hand-added entries — but until now nothing ever read it back. An
 * old Horoshop URL (e.g. `/rakovyna-na-pidlohu-odri`, `/pro-nas`) fell
 * straight through to the 404 page. This is the read side: `proxy.ts`
 * calls it for any path that doesn't match a known current top-level
 * route, and 301/302-redirects to the stored `toPath` if found.
 *
 * Deliberately NOT a general-purpose redirect engine: exact-path match
 * only (no wildcards/regex), since that's what the importer writes and
 * what the admin UI's flat `fromPath`/`toPath` fields model. A path with
 * no matching row is not necessarily "gone forever" — it's simply not a
 * known legacy URL, and falls through to the normal 404 either way.
 */
export interface LegacyRedirectMatch {
  toPath: string;
  statusCode: 301 | 302;
}

/**
 * Paths no `Redirects` row can hold, answered without touching the database.
 *
 * The database is on Neon's free plan, which suspends the compute after five
 * idle minutes and bills (and caps — 100 CU-hours a month) every minute it is
 * awake. This lookup runs for every path the proxy does not recognise, and
 * most of those are bots probing for software the site does not run:
 * `/wp-login.php`, `/xmlrpc.php`, `/.env`, `/wp-content/…`. Each one woke the
 * database for five minutes to learn nothing — and in October 2026 the
 * project ran out of compute four days before the month did, taking the
 * admin, search and checkout down with it.
 *
 * Every real row is a page address from the old site — `/riflo`, `/pro-nas`
 * — and no page address there had a file extension or a dot segment, or
 * belonged to WordPress.
 */
const NOT_A_REDIRECT_ROW =
  /(^|\/)\.|\.[a-z0-9]{1,5}$|^\/(wp-|wp\/|wordpress|xmlrpc|cgi-bin|phpmyadmin|vendor\/)/i;

/**
 * Answers already fetched, per server instance, so a path asked about again
 * (a bot retrying, a crawler revisiting an old link) costs no round-trip.
 * Misses are remembered as well as hits — they are the common case. A row
 * added or changed in the admin reaches an instance that already holds the
 * path within {@link MEMO_TTL_MS}.
 */
const MEMO_TTL_MS = 6 * 60 * 60 * 1000;
const MEMO_MAX_ENTRIES = 1000;
const memo = new Map<
  string,
  { match: LegacyRedirectMatch | null; expires: number }
>();

export async function findLegacyRedirect(
  pathname: string,
): Promise<LegacyRedirectMatch | null> {
  if (NOT_A_REDIRECT_ROW.test(pathname)) return null;

  const remembered = memo.get(pathname);
  if (remembered && remembered.expires > Date.now()) return remembered.match;

  const match = await queryLegacyRedirect(pathname);
  // `undefined` is a failed query, not an answer — remembering it would keep
  // a legacy URL 404ing for hours after the database came back.
  if (match === undefined) return null;
  if (memo.size >= MEMO_MAX_ENTRIES) memo.clear();
  memo.set(pathname, { match, expires: Date.now() + MEMO_TTL_MS });
  return match;
}

/** The row for `pathname`, `null` when there is none, `undefined` when the
 * database could not be asked. */
async function queryLegacyRedirect(
  pathname: string,
): Promise<LegacyRedirectMatch | null | undefined> {
  try {
    const payload = await getPayloadClient();
    const result = await payload.find({
      collection: "redirects",
      where: {
        and: [{ fromPath: { equals: pathname } }, { active: { equals: true } }],
      },
      limit: 1,
      depth: 0,
    });
    const match = result.docs[0];
    if (!match) return null;
    return {
      toPath: match.toPath,
      statusCode: match.statusCode === "302" ? 302 : 301,
    };
  } catch {
    // A DB hiccup here must never take the whole site down — worst case,
    // a legacy URL that would have redirected instead falls through to
    // the normal 404, exactly as it did before this lookup existed.
    return undefined;
  }
}
