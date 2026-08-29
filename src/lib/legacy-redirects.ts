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
 *
 * ## Why the whole table is held in memory
 *
 * This used to be one `payload.find` per lookup, filtered by `fromPath`. It
 * was correct, and per call it was cheap — and it was still the single
 * largest consumer of database compute the site had.
 *
 * The reason is what actually reaches this function. `proxy.ts` answers
 * everything it can from memory first (`KNOWN_TOP_LEVEL_SEGMENTS`, then the
 * 466 addresses in `legacy-url-map.ts`), so what arrives here is precisely
 * the *unknown* paths: `/wp-login.php`, `/.env`, `/xmlrpc.php`, `/admin.php`.
 * Vulnerability scanners produce that traffic continuously, around the clock,
 * and every one of those probes opened a connection to Neon.
 *
 * On Neon that costs far more than the query itself. The compute suspends
 * after five idle minutes, so a single probe keeps it billing for five
 * minutes, and anything touching the site more often than that keeps it awake
 * permanently. The bill for answering "no" to bots came to roughly sixty per
 * cent of a month of compute.
 *
 * The collection is the right size to simply hold: a few hundred rows of two
 * short strings, `fromPath` unique and indexed. Loading it whole turns every
 * lookup — including every miss — into a `Map.get`, and the database sees one
 * read per process per TTL instead of one per probe.
 *
 * ## What this costs
 *
 * A redirect added in the admin now takes up to `TABLE_TTL_MS` to take effect,
 * where before it was live on the next request. That is the honest trade, and
 * it cannot be bought back with `revalidateTag`: this runs inside the proxy,
 * where Next's data cache does not apply (its own documentation notes that
 * fetch cache options have no effect there), and a Payload hook could not
 * reach the memory of a different serverless instance in any case. Fifteen
 * minutes is short enough that an editor who adds a redirect and goes for
 * coffee comes back to a working one, and long enough that the scanners stop
 * paying for compute.
 */
export interface LegacyRedirectMatch {
  toPath: string;
  statusCode: 301 | 302;
}

/** How long a loaded table is served before the next database read. */
const TABLE_TTL_MS = 15 * 60 * 1000;

/**
 * How long to wait after a failed load before trying again.
 *
 * Without it an unreachable database would put us straight back to a query
 * per request — precisely when the database can least afford them.
 */
const RETRY_AFTER_FAILURE_MS = 30 * 1000;

/**
 * Hard cap on rows read.
 *
 * The collection holds a few hundred entries and grows only when someone
 * migrates another site into it. This is not a paging strategy — it is a
 * refusal to load an unbounded table into the proxy's memory if that
 * assumption ever stops holding.
 */
const MAX_ROWS = 5000;

type RedirectTable = ReadonlyMap<string, LegacyRedirectMatch>;

let table: RedirectTable | null = null;
/** Earliest time we may go back to the database. */
let nextLoadAt = 0;
/** In-flight load, so a burst of misses shares one query instead of N. */
let inFlight: Promise<RedirectTable> | null = null;

interface RedirectRow {
  fromPath?: string | null;
  toPath?: string | null;
  statusCode?: string | null;
}

async function readTable(): Promise<RedirectTable> {
  const payload = await getPayloadClient();
  const result = await payload.find({
    collection: "redirects",
    where: { active: { equals: true } },
    limit: MAX_ROWS,
    depth: 0,
  });

  const next = new Map<string, LegacyRedirectMatch>();
  for (const row of result.docs as RedirectRow[]) {
    // `fromPath` is required and unique in the collection, so a row without
    // one is not a duplicate to resolve — it is a row that should not exist,
    // and skipping it beats keying the map on an empty string.
    if (!row.fromPath || !row.toPath) continue;
    next.set(row.fromPath, {
      toPath: row.toPath,
      statusCode: row.statusCode === "302" ? 302 : 301,
    });
  }
  return next;
}

async function getTable(): Promise<RedirectTable | null> {
  /* Gated on the clock alone, not on `table &&`. Having never loaded is
     exactly the state a failing database puts us in, and skipping the
     back-off there would send every request straight back at it. */
  if (Date.now() < nextLoadAt) return table;

  inFlight ??= readTable().finally(() => {
    inFlight = null;
  });

  try {
    table = await inFlight;
    nextLoadAt = Date.now() + TABLE_TTL_MS;
    return table;
  } catch {
    /* A DB hiccup here must never take the whole site down. With a table
       already in memory we keep serving it — a stale redirect beats a 404 on
       an address that does redirect. With none, we answer nothing and the
       request falls through to the normal 404, exactly as it did before this
       lookup existed. */
    nextLoadAt = Date.now() + RETRY_AFTER_FAILURE_MS;
    return table;
  }
}

export async function findLegacyRedirect(
  pathname: string,
): Promise<LegacyRedirectMatch | null> {
  const loaded = await getTable();
  return loaded?.get(pathname) ?? null;
}

/** Drops the cached table. Tests only — production relies on the TTL. */
export function resetLegacyRedirectCache(): void {
  table = null;
  nextLoadAt = 0;
  inFlight = null;
}
