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
 * The `/<category>/ → /shop/<slug>` block below covers the old Horoshop
 * category-listing URLs (found in the exported `catalog-sitemap.xml`). Each
 * right-hand slug is a real `ShopCategory` (validated by `ShopCategorySchema`
 * in `src/app/[locale]/shop/[category]/page.tsx`), so these all resolve to a
 * live listing page. Both `/vulychni-mebli/` and the shorter `/vulychni/`
 * existed as outdoor-furniture listings on the old site, so both point at
 * `/shop/outdoor`. `/brands/` was the old brand index; this site has no brand
 * feature (the exported "brands" were Horoshop demo-template entries, not real
 * ODUDLAB content — so the individual demo brand pages get no redirects), so
 * `/brands/` points at the full `/shop` grid.
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
  { fromPath: "/kontaktna-informatsiya", toPath: "/contact" },
  { fromPath: "/blog", toPath: "/" },
  { fromPath: "/rakovyny", toPath: "/shop/sinks" },
  { fromPath: "/vazony", toPath: "/shop/planters" },
  { fromPath: "/stolyky", toPath: "/shop/tables" },
  { fromPath: "/vulychni-mebli", toPath: "/shop/outdoor" },
  { fromPath: "/vulychni", toPath: "/shop/outdoor" },
  { fromPath: "/betonni-moduli-dlia-stiny", toPath: "/shop/wall-modules" },
  { fromPath: "/paneli", toPath: "/shop/wall-panels" },
  { fromPath: "/panno-na-stinu", toPath: "/shop/wall-art" },
  { fromPath: "/brands", toPath: "/shop" },
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
