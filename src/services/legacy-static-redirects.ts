import type { Payload } from "payload";

/**
 * Static legacy-URL → current-route redirects (Prompt 9 §3).
 *
 * Distinct from `horoshop-import-service.ts`'s per-product redirects (which
 * are derived from each source row's own `alias` field): these are the old
 * Horoshop site's *informational* page URLs, named explicitly in Prompt 9 —
 * `/katalog/`, `/pro-nas/`, `/oplata-i-dostavka/`, `/obmin-ta-povernennya/`,
 * `/pamiatka-korystuvannia/`, `/kontaktna-informatsiya/`, `/blog/` — none of
 * which have a per-product `alias` to derive from, so they need their own
 * fixed mapping to whatever current route covers the same topic.
 *
 * `/blog/` has no direct replacement (this site has no blog/article feature
 * — confirmed nothing was ever imported for one), so it points at the
 * homepage rather than a 404: a retired content hub redirecting to the
 * homepage is a standard, defensible SEO practice when no 1:1 successor
 * page exists.
 *
 * `/pamiatka-korystuvannia/` ("care/usage memo") maps to `/care` — a real
 * route today, even though its content is still a `PlaceholderPage` (see
 * `src/app/[locale]/care/page.tsx`); the redirect only needs a *working*
 * target, not finished copy.
 *
 * The old *category* URLs are deliberately absent from this list. They used
 * to be here, mapping `/rakovyny/ → /shop/sinks` and so on; they are gone
 * because the categories now live at those very addresses (see
 * `shopCategorySlugs` in `src/lib/schemas/product-categories.ts`). The best
 * redirect is the one you don't need.
 *
 * `/vulychni/` is the exception, and it was a bug worth recording. It sat in
 * the category block pointing at `/shop/outdoor` on the assumption that it
 * was a second name for outdoor *furniture*. It wasn't: in the old site's own
 * page list it appears inside the run `/pidlohovi/ /nakladni/ /vulychni/
 * /do-domu/ /zhurnalni/`, which is the Horoshop section order for sink types,
 * then planter placements, then table types. `/vulychni/` is «Вазони/Вуличні»
 * — outdoor *planters*, six products — and it now points at the subcategory
 * page that actually lists them.
 *
 * `/brands/` is *not* here, and it is the one entry that was removed rather
 * than added. It briefly pointed at `/shop`, on the reasoning that a retired
 * index may as well hand its visitors the full grid. That reasoning only
 * holds when the retired page had real content: `sitemap-brands.xml` shows
 * the six brands under it were `/apple/`, `/clothes/`, `/apparel/`,
 * `/skusu/`, `/homedeco/`, `/lights/` — Horoshop's demo template, not
 * ODUDLAB's. Redirecting a template artefact into the real catalogue asserts
 * a relevance that does not exist, which Google reads as a soft 404 anyway.
 * `/brands/` and all six now answer `410` via `GONE_PATHS` in
 * `src/lib/gone-paths.ts`.
 *
 * ## The sub-section URLs
 *
 * `/pidlohovi/ /nakladni/ /vulychni/ /do-domu/ /zhurnalni/` are the old site's
 * five facet pages, and they get three different treatments because the
 * catalogue genuinely has three different situations:
 *
 *   `/pidlohovi/` `/nakladni/` `/vulychni/`  → the subcategory page (16/16/6)
 *   `/do-domu/`                              → `/vazony?placement=indoor`
 *   `/zhurnalni/`                            → `/stolyky`
 *
 * `/do-domu/` is a real split (14 products) with no page of its own, because
 * no target query wants one — so it redirects to the same listing expressed as
 * a filter. `/zhurnalni/` redirects to its *parent* because every table in the
 * catalogue is a coffee table: a `/stolyky/zhurnalni` page would list exactly
 * what `/stolyky` lists, and two URLs competing for one intent is the thing
 * this map exists to avoid.
 *
 * `/dohliad-za-vyrobamy/` is the old site's second care page and joins
 * `/pamiatka-korystuvannia/` on `/care`. `/mobilna/` was Horoshop's
 * mobile-version entry point, which has no successor concept at all on a
 * responsive site, so it goes to the homepage.
 *
 * ## Seeding cannot repair a wrong row
 *
 * `seedStaticLegacyRedirects` is skip-if-exists, so editing an entry here has
 * no effect on a row already in the database — it only ever adds missing ones.
 * That is the right default (it must never clobber a hand-edited redirect) but
 * it means a *wrong* row has to be reconciled deliberately. Two were:
 *
 *   `/vulychni → /shop/outdoor`   the category-vs-planter mix-up above, and
 *                                 `/shop/outdoor` no longer exists either, so
 *                                 this was a live 301 into a 404.
 *   the seven `/<category> → /shop/<id>` rows, now inert (the proxy
 *                                 short-circuits a first segment that is a
 *                                 real route) but still wrong on their face.
 *
 * See `scripts/reconcile-legacy-redirects.ts`, which is the deliberate,
 * dry-run-by-default counterpart to this seeder.
 */
export const STATIC_LEGACY_REDIRECTS: ReadonlyArray<{
  fromPath: string;
  toPath: string;
}> = [
  { fromPath: "/katalog", toPath: "/shop" },
  { fromPath: "/pro-nas", toPath: "/about" },
  { fromPath: "/oplata-i-dostavka", toPath: "/payment-delivery" },
  { fromPath: "/obmin-ta-povernennya", toPath: "/returns" },
  { fromPath: "/pamiatka-korystuvannia", toPath: "/care" },
  { fromPath: "/dohliad-za-vyrobamy", toPath: "/care" },
  { fromPath: "/kontaktna-informatsiya", toPath: "/contact" },
  { fromPath: "/blog", toPath: "/" },
  { fromPath: "/mobilna", toPath: "/" },

  /* The old sub-section URLs. Three of them now have a page of their own; the
   * other two deliberately do not — see the note under the list. */
  { fromPath: "/pidlohovi", toPath: "/rakovyny/pidlohovi" },
  { fromPath: "/nakladni", toPath: "/rakovyny/nakladni" },
  { fromPath: "/vulychni", toPath: "/vazony/vulychni" },
  { fromPath: "/do-domu", toPath: "/vazony?placement=indoor" },
  { fromPath: "/zhurnalni", toPath: "/stolyky" },
];

export interface SeedStaticRedirectsResult {
  created: number;
  skippedExisting: number;
}

/**
 * Idempotent: only creates a row if `fromPath` doesn't already have one
 * (mirrors the existing-row check in `horoshop-import-service.ts`), so this
 * is safe to re-run any number of times (e.g. on every deploy) without
 * duplicating or clobbering a hand-edited redirect.
 */
export async function seedStaticLegacyRedirects(
  payload: Payload,
): Promise<SeedStaticRedirectsResult> {
  let created = 0;
  let skippedExisting = 0;

  for (const { fromPath, toPath } of STATIC_LEGACY_REDIRECTS) {
    const existing = await payload.find({
      collection: "redirects",
      where: { fromPath: { equals: fromPath } },
      limit: 1,
      overrideAccess: true,
    });
    if (existing.docs.length > 0) {
      skippedExisting++;
      continue;
    }

    await payload.create({
      collection: "redirects",
      overrideAccess: true,
      data: {
        fromPath,
        toPath,
        statusCode: "301",
        active: true,
        note: "Seeded static legacy-informational-page redirect (Prompt 9 §3).",
      },
    });
    created++;
  }

  return { created, skippedExisting };
}
