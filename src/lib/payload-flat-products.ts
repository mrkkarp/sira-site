import "server-only";
import rawSource from "@/data/products.source.json";
import {
  ProductSchema,
  ProductSourceFileSchema,
  ShopCategorySchema,
  type Product,
  type ProductVariant,
  type ShopCategory,
} from "@/lib/schemas/product";
import { groupProductSourceRows } from "@/lib/product-grouping";
import { getPayloadClient } from "@/lib/payload-client";
import { defaultLocale, type Locale } from "@/i18n/config";
import type {
  Product as PayloadProduct,
  Media,
  Category,
} from "@/payload-types";

/**
 * Payload → presentation adapter (owner directive #6/#7). Turns the real
 * Postgres-backed `Products` this app's Horoshop importer wrote (see
 * `src/services/horoshop-import-service.ts`) into the exact flat
 * `@/lib/schemas/product` `Product` shape every storefront render path
 * already consumes — so switching `CATALOG_SOURCE=payload` changes *where*
 * the catalog is read from without rewriting any of the six render paths.
 *
 * Why a merge, not a pure Payload read: the flat presentation `Product`
 * carries facts the Payload model does **not** round-trip losslessly:
 *  - `sourceCategory` and its `sinkType`/`planterPlacement` sub-taxonomy
 *    (Payload stores only the top-level category slug),
 *  - the verbatim `specEntries` block (the importer maps only ~8 of the 11
 *    real spec labels into typed `specs.*` fields — see
 *    `mapSpecEntriesToPayloadSpecs`), and
 *  - `heightCm`/`widthCm`, per-variant `colorLabel`, lead-time weeks and the
 *    "may be out of stock" flag as their original parsed values.
 *
 * None of those are editable in the admin UI (there is no field for them) —
 * they are fixed source taxonomy. So Payload is authoritative for **the
 * product set and every editable field** (name, descriptions, prices, stock,
 * and the linked R2 photos), while the retained Horoshop snapshot
 * (`products.source.json`, kept as the "temporary fallback" the owner asked
 * for in #7) supplies only that immutable structural enrichment, matched by
 * SKU. A Payload product with no snapshot match (e.g. one added by hand in
 * the admin) still renders — it just has no legacy sub-taxonomy/specs until
 * those get modeled.
 */

/** R2 public base (owner-chosen "Публічний R2 + домен"), e.g.
 * `https://pub-….r2.dev`. Trailing slash trimmed so URL joins are clean. */
const MEDIA_BASE = (process.env.NEXT_PUBLIC_MEDIA_BASE_URL ?? "").replace(
  /\/+$/,
  "",
);

/** Resolves a (possibly-populated, `depth: 1`) media relation to a public
 * URL. Prefers `${MEDIA_BASE}/<filename>` (the R2 public bucket) and falls
 * back to Payload's own `url` (local-disk/admin route) so the storefront
 * still shows images in a local dev run with no R2 configured. Returns
 * `undefined` for a bare id (not populated) or a media doc with no file. */
function mediaUrl(
  media: number | Media | null | undefined,
): string | undefined {
  if (media == null || typeof media === "number") return undefined;
  if (media.filename && MEDIA_BASE) return `${MEDIA_BASE}/${media.filename}`;
  return media.url ?? undefined;
}

/** SKU → snapshot-derived flat product, for structural enrichment. Built
 * once per call (cheap: parses the bundled JSON), keyed on the same `sku`
 * the importer wrote onto each Payload product. */
function buildEnrichmentBySku(): Map<string, Product> {
  const rows = ProductSourceFileSchema.parse(rawSource satisfies unknown[]);
  return new Map(groupProductSourceRows(rows).map((p) => [p.sku, p]));
}

function resolveShopCategory(
  doc: PayloadProduct,
  snapshot: Product | undefined,
): ShopCategory {
  if (snapshot) return snapshot.shopCategory;
  const category = doc.category as number | Category;
  const slug = typeof category === "object" ? category.slug : undefined;
  const parsed = slug ? ShopCategorySchema.safeParse(slug) : undefined;
  // Same conservative fallback bucket the importer's `mapCategory` uses for
  // an unmapped source category, rather than throwing on an admin-added
  // product in a not-yet-modeled category.
  return parsed?.success ? parsed.data : "wall-art";
}

function payloadDocToFlatProduct(
  doc: PayloadProduct,
  snapshot: Product | undefined,
): Product {
  const payloadVariants = doc.variants ?? [];
  const baseVariant = payloadVariants[0];
  const customVariant =
    payloadVariants.find((v) => v.optionAxes?.custom) ??
    (payloadVariants.length > 1 ? payloadVariants[1] : undefined);
  const hasCustom = Boolean(customVariant) || Boolean(snapshot?.customColour);

  // Ordered photos from Payload's linked R2 media (main first, then gallery).
  // The importer stores `mainImage` = base photo and appends the custom-colour
  // photo (if any) as the last gallery entry.
  const orderedPhotos = [doc.mainImage, ...(doc.gallery ?? [])]
    .map(mediaUrl)
    .filter((u): u is string => Boolean(u));

  // The base photo is always the first resolved image (Payload `mainImage`);
  // the importer appends a *distinct* custom-colour photo as the LAST gallery
  // entry only when the two colourways don't share the same photo. So a
  // trailing custom photo is peeled off for the custom variant ONLY when there
  // are at least two resolved images — otherwise the single image is the base
  // photo (and the custom colour, if any, simply reuses it). Falls back to the
  // snapshot's local `/products/*.jpg` paths (served from `public/`) only when
  // Payload resolved no media at all for this product.
  let basePhotos: string[];
  let customPhoto: string;
  if (orderedPhotos.length > 0) {
    if (hasCustom && orderedPhotos.length >= 2) {
      basePhotos = orderedPhotos.slice(0, -1);
      customPhoto = orderedPhotos[orderedPhotos.length - 1];
    } else {
      basePhotos = orderedPhotos;
      customPhoto = orderedPhotos[0];
    }
  } else {
    basePhotos = snapshot?.base.gallery ?? [];
    customPhoto = snapshot?.customColour?.photo ?? snapshot?.base.photo ?? "";
  }
  const basePhoto = basePhotos[0] ?? snapshot?.base.photo ?? "";

  const description = doc.shortDescription ?? snapshot?.base.description ?? "";

  const base: ProductVariant = {
    sku: baseVariant?.sku ?? snapshot?.base.sku ?? doc.sku,
    colorLabel: snapshot?.base.colorLabel,
    price: baseVariant?.price ?? doc.basePrice ?? snapshot?.base.price ?? 0,
    photo: basePhoto,
    gallery: basePhotos.length > 0 ? basePhotos : undefined,
    description,
    leadTimeWeeks: snapshot?.base.leadTimeWeeks,
    mayBeOutOfStock: snapshot?.base.mayBeOutOfStock,
  };

  const customColour: ProductVariant | undefined = hasCustom
    ? {
        sku: customVariant?.sku ?? snapshot?.customColour?.sku ?? `${doc.sku}-custom`,
        colorLabel:
          customVariant?.optionAxes?.custom ??
          snapshot?.customColour?.colorLabel,
        price:
          customVariant?.price ??
          snapshot?.customColour?.price ??
          base.price,
        photo: customPhoto,
        gallery: [customPhoto],
        // The custom-colour variant is the same product in a different colour,
        // so it shares the (Payload-authoritative) base description rather than
        // the snapshot's per-variant copy. Preferring the snapshot here would
        // let stale source text (raw HTML entities, old embedded prices) win
        // over freshly-edited admin copy — the opposite of what payload mode
        // is for. Payload has no separate per-colour description field.
        description,
        leadTimeWeeks: snapshot?.customColour?.leadTimeWeeks,
        mayBeOutOfStock: snapshot?.customColour?.mayBeOutOfStock,
      }
    : undefined;

  return ProductSchema.parse({
    slug: doc.slug,
    sku: doc.sku,
    name: doc.name,
    sourceCategory:
      snapshot?.sourceCategory ?? resolveShopCategory(doc, snapshot),
    shopCategory: resolveShopCategory(doc, snapshot),
    sinkType: snapshot?.sinkType,
    outdoorType: snapshot?.outdoorType,
    planterPlacement: snapshot?.planterPlacement,
    heightCm: snapshot?.heightCm,
    widthCm: snapshot?.widthCm,
    specEntries: snapshot?.specEntries ?? [],
    base,
    customColour,
  });
}

/**
 * Loads every published Payload product and adapts it to the flat
 * presentation `Product[]`, reading the localized copy (name / description /
 * SEO) for the requested `locale`. Payload's localization has fallback on, so
 * a locale with no own value for a field transparently resolves to the
 * `uk` default — meaning `/en` and `/pl` show real translations where they
 * exist and fall back to the Ukrainian source elsewhere, never blank.
 * `depth: 1` so `mainImage`/`gallery` come back populated with their
 * `filename` for R2 URL resolution. Photos/prices/specs are locale-invariant.
 */
export async function loadPayloadFlatProducts(
  locale: Locale = defaultLocale,
): Promise<Product[]> {
  const payload = await getPayloadClient();
  const enrichment = buildEnrichmentBySku();

  const result = await payload.find({
    collection: "products",
    where: { editorialStatus: { equals: "published" } },
    locale,
    depth: 1,
    limit: 0,
    overrideAccess: true,
  });

  return (result.docs as PayloadProduct[]).map((doc) =>
    payloadDocToFlatProduct(doc, enrichment.get(doc.sku)),
  );
}
