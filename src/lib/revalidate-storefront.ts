/**
 * Storefront cache invalidation, shared by every collection whose content the
 * catalogue render reads (owner directive #12: "verify admin changes appear on
 * site after publish/revalidation").
 *
 * Deliberately NOT `server-only` and with a dynamic `next/cache` import: this
 * module is pulled in by `src/collections/*.ts`, which `payload.config.ts`
 * loads in plain `tsx` CLI processes too (`scripts/import-horoshop.ts` and
 * friends). There is no Next server there, so `revalidateTag`/`revalidatePath`
 * would throw — 38 spurious throws per import run. The `NEXT_RUNTIME` guard
 * skips the whole thing outside Next, and the dynamic import keeps Next's
 * request-scoped module out of the CLI's graph entirely.
 */

/**
 * Cache tag for the adapted product catalogue (`loadPayloadFlatProducts`).
 *
 * The catalogue read is one `payload.find` over every published product at
 * `depth: 1` plus the snapshot enrichment merge, and it runs on **every**
 * request to a dynamic catalogue route (`/shop`, `/shop/[category]`,
 * `/products/[slug]`, `/search`). Caching it behind this tag turns that into
 * one read per edit instead of one per visitor; anything that can change what
 * the catalogue renders must revalidate the tag.
 */
export const CATALOGUE_CACHE_TAG = "catalogue";

/**
 * Drops the storefront's cached catalogue and rendered routes.
 *
 * Both halves are needed and they are not interchangeable: `revalidateTag`
 * clears the data cache entry the catalogue loader writes, while
 * `revalidatePath` clears Next's rendered-route cache. Clearing only the
 * latter would leave the loader serving the old products from the data cache.
 *
 * @param slug - Product slug, when the change was to one specific product, so
 *   its own page is invalidated as well as the shared catalogue.
 */
export async function revalidateStorefront(
  slug?: string | null,
): Promise<void> {
  if (!process.env.NEXT_RUNTIME) return;
  try {
    const { revalidatePath, revalidateTag } = await import("next/cache");
    // `{ expire: 0 }` rather than the recommended `"max"` profile. `"max"` is
    // stale-while-revalidate: the next visitor is served the *old* catalogue
    // while the fresh one loads behind them. That is the right trade for
    // ambient freshness, but this call is the admin pressing Save, and owner
    // directive #12 is "verify admin changes appear on site after
    // publish/revalidation" — an editor who reloads the storefront to check
    // their edit must not be shown the version they just replaced. Expiring
    // immediately costs one blocking read on the next request and makes the
    // check honest.
    //
    // `updateTag`, which is the purpose-built read-your-own-writes API, is not
    // an option: it only works inside a Server Action, and this runs in a
    // Payload collection hook (a Route Handler context).
    revalidateTag(CATALOGUE_CACHE_TAG, { expire: 0 });
    // Whole storefront: catalog grids, homepage, search and the sitemap all
    // read the catalogue, so revalidate broadly rather than trying to
    // enumerate routes.
    revalidatePath("/", "layout");
    if (slug) revalidatePath(`/products/${slug}`, "page");
  } catch {
    // Outside a request/render scope (or Next not initialised) — nothing to
    // revalidate; the change is still persisted, just not force-refreshed.
  }
}
