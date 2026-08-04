import { getPayload } from "payload";
import config from "../payload.config";
import { STATIC_LEGACY_REDIRECTS } from "@/services/legacy-static-redirects";
import { GONE_PATHS } from "@/lib/gone-paths";
import { shopCategorySlugs } from "@/lib/schemas/product-categories";

/**
 * Repairs `Redirects` rows that the seeder cannot touch.
 *
 *   npm run redirects:reconcile          # dry run — prints, changes nothing
 *   npm run redirects:reconcile:apply    # actually writes
 *
 * `seedStaticLegacyRedirects` is deliberately skip-if-exists: it must never
 * clobber a redirect somebody added or corrected by hand in the admin UI. The
 * cost of that safety is that a row which was seeded *wrong* stays wrong
 * forever, however many times the seeder runs — editing
 * `STATIC_LEGACY_REDIRECTS` fixes new databases and no existing one.
 *
 * Two things need fixing in the live collection after the categories moved to
 * the top level:
 *
 * **Wrong targets.** `/vulychni` was seeded as `/shop/outdoor` on the reading
 * that it meant outdoor *furniture*. It doesn't — on the old site it sat in
 * the run `/pidlohovi/ /nakladni/ /vulychni/ /do-domu/ /zhurnalni/`, which is
 * sink types, then planter placements, then table types, so it is
 * «Вазони/Вуличні», six outdoor planters. And `/shop/outdoor` is not a URL any
 * more either, so this was a live 301 pointing into a 404 — the single worst
 * shape a redirect can have, because it looks handled in every report while
 * losing the visitor and the link equity both.
 *
 * **Rows that can never fire.** The seven `/<categorySlug> → /shop/<id>` rows
 * are fossils from when the categories lived under `/shop`. Today `/rakovyny`
 * *is* the page, and `src/proxy.ts` skips the redirect lookup for any first
 * segment that is a live route, so they are inert. Inert is not the same as
 * harmless: the day someone edits `KNOWN_TOP_LEVEL_SEGMENTS` these rows would
 * start 301ing five live Google Ads landing pages into a 404. Deactivated
 * rather than deleted — reversible, and the note records why.
 *
 * **Rows for paths that are now `410`.** `/brands` was seeded as a 301 to
 * `/shop` before the six brands under it turned out to be Horoshop demo
 * entries; it is answered by `GONE_PATHS` now, which the proxy checks first,
 * so the row is inert for the same reason and gets retired the same way.
 *
 * All three passes are idempotent: a second run reports nothing to do.
 */

const APPLY = process.argv.includes("--apply");

/** The rows whose `fromPath` is now a live page in its own right. */
const LIVE_CATEGORY_PATHS = new Set(
  Object.values(shopCategorySlugs).map((slug) => `/${slug}`),
);

type Change = { fromPath: string; what: string };

async function main() {
  const payload = await getPayload({ config });

  const { docs } = await payload.find({
    collection: "redirects",
    limit: 1000,
    depth: 0,
    sort: "fromPath",
    overrideAccess: true,
  });
  const byFromPath = new Map(docs.map((doc) => [doc.fromPath, doc]));

  const planned: Change[] = [];

  // Pass A — make `STATIC_LEGACY_REDIRECTS` authoritative for the paths it
  // names. Only paths already in the collection: creating the missing ones is
  // the seeder's job, and running it afterwards is the documented order.
  for (const { fromPath, toPath } of STATIC_LEGACY_REDIRECTS) {
    const row = byFromPath.get(fromPath);
    if (!row) continue;
    if (row.toPath === toPath && row.active) continue;

    planned.push({
      fromPath,
      what:
        row.toPath === toPath
          ? `reactivate (→ ${toPath})`
          : `retarget ${row.toPath} → ${toPath}${row.active ? "" : " + reactivate"}`,
    });

    if (APPLY) {
      await payload.update({
        collection: "redirects",
        id: row.id,
        overrideAccess: true,
        data: {
          toPath,
          active: true,
          note: "Reconciled against STATIC_LEGACY_REDIRECTS (categories moved to top-level slugs).",
        },
      });
    }
  }

  // Pass B — retire the rows that would redirect a live page away from itself.
  for (const row of docs) {
    if (!LIVE_CATEGORY_PATHS.has(row.fromPath) || !row.active) continue;

    planned.push({
      fromPath: row.fromPath,
      what: `deactivate (fossil → ${row.toPath}; this path is now a real page)`,
    });

    if (APPLY) {
      await payload.update({
        collection: "redirects",
        id: row.id,
        overrideAccess: true,
        data: {
          active: false,
          note: "Retired: this path is now a live category page, not a legacy URL.",
        },
      });
    }
  }

  // Pass C — retire the rows whose path is now answered with a `410`.
  for (const row of docs) {
    if (!GONE_PATHS.has(row.fromPath) || !row.active) continue;

    planned.push({
      fromPath: row.fromPath,
      what: `deactivate (was → ${row.toPath}; this path is 410 Gone now)`,
    });

    if (APPLY) {
      await payload.update({
        collection: "redirects",
        id: row.id,
        overrideAccess: true,
        data: {
          active: false,
          note: "Retired: Horoshop demo-template URL, served as 410 Gone (see src/lib/gone-paths.ts).",
        },
      });
    }
  }

  if (planned.length === 0) {
    console.log("Nothing to reconcile — the collection already matches.");
  } else {
    console.log(
      `${APPLY ? "Applied" : "DRY RUN — would apply"} ${planned.length} change(s):`,
    );
    for (const change of planned) {
      console.log(`  ${change.fromPath}: ${change.what}`);
    }
    if (!APPLY) {
      console.log("\nRe-run with --apply to write these.");
    }
  }

  process.exit(0);
}

main().catch((error) => {
  console.error("Reconciling legacy redirects failed:", error);
  process.exit(1);
});
