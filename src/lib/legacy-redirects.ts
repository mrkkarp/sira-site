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

export async function findLegacyRedirect(
  pathname: string,
): Promise<LegacyRedirectMatch | null> {
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
    return null;
  }
}
