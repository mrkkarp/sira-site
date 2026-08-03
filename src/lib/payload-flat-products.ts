import "server-only";
import { unstable_cache } from "next/cache";
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
import { CATALOGUE_CACHE_TAG } from "@/lib/revalidate-storefront";
import { buildSpecEntriesFromPayload } from "@/lib/payload-spec-entries";
import { getDictionary, type Dictionary } from "@/i18n/get-dictionary";
import { defaultLocale, type Locale } from "@/i18n/config";
import type {
  Product as PayloadProduct,
  Media,
  Category,
  Colour,
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

/** A resolved media relation with the one editorial fact the storefront needs
 * about it: whether it is a photograph or a dimensioned technical drawing.
 * `kind` is a required field with a `photo` default, but a media doc written
 * before the column existed can still arrive without one, so it is defaulted
 * again here rather than trusted. */
function mediaItem(
  media: number | Media | null | undefined,
): { url: string; kind: "photo" | "drawing" } | undefined {
  const url = mediaUrl(media);
  if (!url) return undefined;
  const kind = typeof media === "object" && media ? media.kind : undefined;
  return { url, kind: kind === "drawing" ? "drawing" : "photo" };
}

/** Splits resolved media into photographs and technical drawings, preserving
 * the admin's ordering within each group. */
function partitionMedia(media: (number | Media | null | undefined)[]): {
  photos: string[];
  drawings: string[];
} {
  const photos: string[] = [];
  const drawings: string[] = [];
  for (const entry of media) {
    const item = mediaItem(entry);
    if (!item) continue;
    (item.kind === "drawing" ? drawings : photos).push(item.url);
  }
  return { photos, drawings };
}

/** SKU → snapshot-derived flat product, for structural enrichment. Built
 * once per call (cheap: parses the bundled JSON), keyed on the same `sku`
 * the importer wrote onto each Payload product. */
function buildEnrichmentBySku(): Map<string, Product> {
  const rows = ProductSourceFileSchema.parse(rawSource satisfies unknown[]);
  return new Map(groupProductSourceRows(rows).map((p) => [p.sku, p]));
}

/**
 * The base variant's colour name, in the requested locale.
 *
 * `optionAxes.colour` is a relationship to a Colour document whose
 * `displayName` is localized, and the catalogue query runs at `depth: 1`, so a
 * linked colour arrives populated and already resolved to the current locale.
 * The snapshot's `colorLabel` is the Ukrainian string frozen at import time —
 * it is only a fallback for the 7 products whose source export states no
 * colour at all, where nothing better exists.
 *
 * Returns `undefined` for a bare id (relationship not populated), rather than
 * silently falling back to Ukrainian, so a depth regression surfaces as a
 * missing colour instead of an untranslated one.
 */
function colourLabelFromPayload(
  colour: number | Colour | null | undefined,
): string | undefined {
  if (colour == null || typeof colour === "number") return undefined;
  return colour.displayName || undefined;
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
  dictionary: Dictionary,
  locale: Locale,
): Product {
  const payloadVariants = doc.variants ?? [];
  const baseVariant = payloadVariants[0];
  const customVariant =
    payloadVariants.find((v) => v.optionAxes?.custom) ??
    (payloadVariants.length > 1 ? payloadVariants[1] : undefined);
  const hasCustom = Boolean(customVariant) || Boolean(snapshot?.customColour);

  // Ordered media from Payload's linked R2 files (main first, then gallery),
  // split by what each file is. The Horoshop export delivered dimensioned
  // drawings through the same gallery field as the photographs — 17 of them
  // across the catalogue — and they are separated here, once, so that no
  // downstream consumer has to wonder whether `gallery[0]` is a photograph.
  const { photos: orderedPhotos, drawings: orderedDrawings } = partitionMedia([
    doc.mainImage,
    ...(doc.gallery ?? []),
  ]);

  // Photos the admin has actually attached to a variant. This is the only
  // statement in the data about which photograph shows which colourway, so it
  // is the only thing trusted to make that claim.
  const { photos: customVariantPhotos, drawings: customVariantDrawings } =
    partitionMedia(customVariant?.photos ?? []);

  // Everything below used to hang off a positional guess: "the importer
  // appends the custom-colour photo last, so peel the last gallery entry off
  // for the custom variant." Measured against the real catalogue that guess is
  // wrong far more often than it is right — of 29 products with a custom
  // colour, only 2 have a genuinely distinct custom photograph, while 12 have
  // a *technical drawing* sitting last in the gallery. So the rule was
  // reliably promoting a line drawing to "here is this piece in your colour",
  // and — worse — deleting it from the gallery on the way past, which is why
  // six-image galleries were rendering five thumbnails.
  //
  // The replacement makes no positional claim at all. A custom photo exists
  // only when an admin attached one to the custom variant; otherwise the
  // custom colourway shows the same photograph as the base, which is honest:
  // we have no picture of this piece in that colour. Nothing is discarded:
  // drawings simply travel in `drawings` instead of `gallery`.
  //
  // Falls back to the snapshot's local `/products/*.jpg` paths (served from
  // `public/`) only when Payload resolved no photograph at all for this
  // product. That fallback carries no drawings — the snapshot has no way to
  // mark one, and showing an unlabelled drawing is the bug this all fixes.
  let basePhotos: string[];
  let baseDrawings: string[];
  let customPhoto: string;
  if (orderedPhotos.length > 0) {
    basePhotos = orderedPhotos;
    baseDrawings = orderedDrawings;
    customPhoto = customVariantPhotos[0] ?? orderedPhotos[0];
  } else {
    basePhotos = snapshot?.base.gallery ?? [];
    baseDrawings = [];
    customPhoto = snapshot?.customColour?.photo ?? snapshot?.base.photo ?? "";
  }
  const basePhoto = basePhotos[0] ?? snapshot?.base.photo ?? "";
  const customDrawings =
    customVariantDrawings.length > 0 ? customVariantDrawings : baseDrawings;

  const description = doc.shortDescription ?? snapshot?.base.description ?? "";

  const payloadSpecEntries = buildSpecEntriesFromPayload(
    doc.specs,
    dictionary,
    locale,
  );

  const base: ProductVariant = {
    sku: baseVariant?.sku ?? snapshot?.base.sku ?? doc.sku,
    colorLabel:
      colourLabelFromPayload(baseVariant?.optionAxes?.colour) ??
      snapshot?.base.colorLabel,
    price: baseVariant?.price ?? doc.basePrice ?? snapshot?.base.price ?? 0,
    photo: basePhoto,
    gallery: basePhotos.length > 0 ? basePhotos : undefined,
    drawings: baseDrawings.length > 0 ? baseDrawings : undefined,
    description,
    leadTimeWeeks: snapshot?.base.leadTimeWeeks,
    mayBeOutOfStock: snapshot?.base.mayBeOutOfStock,
  };

  const customColour: ProductVariant | undefined = hasCustom
    ? {
        sku:
          customVariant?.sku ??
          snapshot?.customColour?.sku ??
          `${doc.sku}-custom`,
        colorLabel:
          customVariant?.optionAxes?.custom ??
          snapshot?.customColour?.colorLabel,
        price:
          customVariant?.price ?? snapshot?.customColour?.price ?? base.price,
        photo: customPhoto,
        // The custom variant's own photo set when the admin attached one;
        // otherwise the base gallery, because the object is the same object —
        // only the colour differs, and we have no photograph of that.
        gallery:
          customVariantPhotos.length > 0
            ? customVariantPhotos
            : basePhotos.length > 0
              ? basePhotos
              : undefined,
        // Dimensions don't change with the colour, so the custom variant
        // inherits the base drawings unless the admin attached its own —
        // unconditionally, unlike `gallery`, which is inherited only when the
        // custom variant has no photographs of its own.
        drawings: customDrawings.length > 0 ? customDrawings : undefined,
        // The custom-colour variant is the same product in a different colour,
        // so it shares the (Payload-authoritative) base description rather than
        // the snapshot's per-variant copy. Preferring the snapshot here would
        // let stale source text (raw HTML entities, old embedded prices) win
        // over freshly-edited admin copy — the opposite of what payload mode
        // is for. Payload has no separate per-colour description field.
        description,
        leadTimeWeeks: snapshot?.customColour?.leadTimeWeeks,
        mayBeOutOfStock: snapshot?.customColour?.mayBeOutOfStock,
        // A custom RAL/NCS colour routes to the consultation CTA by default —
        // its final price/feasibility needs confirming. An admin opts a
        // specific product's custom colourway into direct checkout by marking
        // that variant "В наявності" (inStock) with a real price; every other
        // status (the default "madeToOrder", "quoteOnly", "unavailable"…)
        // keeps it a consultation. Left `undefined` when there is no Payload
        // variant (snapshot-only), so `buildVariantModel` applies the same
        // "consultation by default" rule.
        contactRequired: customVariant
          ? customVariant.status !== "inStock"
          : undefined,
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
    // Payload's typed `specs` group is authoritative, so editing a spec in
    // the admin now actually changes the site and each locale renders its
    // own translated labels/values. The retained snapshot block is used only
    // as a fallback for a product Payload has NO specs for at all — that
    // keeps the 22 legacy products whose characteristics still live only in
    // the source `fullDesc` text from going blank mid-migration. It is a
    // whole-block fallback on purpose: mixing translated Payload rows with
    // verbatim Ukrainian snapshot rows in one table would look broken on
    // `/en` and `/pl`.
    specEntries:
      payloadSpecEntries.length > 0
        ? payloadSpecEntries
        : (snapshot?.specEntries ?? []),
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
async function loadPayloadFlatProductsUncached(
  locale: Locale,
): Promise<Product[]> {
  const payload = await getPayloadClient();
  const enrichment = buildEnrichmentBySku();
  // Spec *labels* live in the UI dictionaries (they are the same for every
  // product), while spec *values* are per-product localized Payload fields.
  const dictionary = await getDictionary(locale);

  const result = await payload.find({
    collection: "products",
    where: { editorialStatus: { equals: "published" } },
    locale,
    depth: 1,
    limit: 0,
    overrideAccess: true,
  });

  return (result.docs as PayloadProduct[]).map((doc) =>
    payloadDocToFlatProduct(doc, enrichment.get(doc.sku), dictionary, locale),
  );
}

/**
 * Cached across requests, not just within one.
 *
 * The uncached read above is a `payload.find` over every published product at
 * `depth: 1` (so each product's media, category and colour relations are
 * joined) plus the snapshot enrichment merge and a zod parse per product. It
 * used to run on **every** request to a dynamic catalogue route — `/shop`,
 * `/shop/[category]`, `/products/[slug]`, `/search` are all `ƒ` in the build
 * output because they read `searchParams` — which put a full catalogue
 * round-trip to Neon in front of every visitor. Measured against production
 * that was ~430–720 ms TTFB on those routes versus ~190–260 ms on the
 * prerendered home page.
 *
 * `react`'s `cache()` in `products.ts` does not help here: it dedupes within a
 * single request and is thrown away at the end of it. This is Next's data
 * cache, which persists across requests and invocations.
 *
 * Invalidation is by tag, from the `afterChange`/`afterDelete` hooks on every
 * collection the catalogue render reads — Products, Media, Categories, Colours
 * (see `src/lib/revalidate-storefront.ts`). The `revalidate` window is a
 * backstop for anything that changes the catalogue without going through those
 * hooks (a direct SQL edit, an importer run outside Next), so the site
 * converges on its own rather than serving a stale catalogue indefinitely.
 *
 * Keyed by locale: the query passes `locale` to Payload and merges
 * locale-specific dictionary labels, so `uk`/`en`/`pl` are genuinely different
 * results and must not share an entry.
 */
const loadPayloadFlatProductsCached = unstable_cache(
  loadPayloadFlatProductsUncached,
  ["payload-flat-products"],
  { tags: [CATALOGUE_CACHE_TAG], revalidate: 300 },
);

export function loadPayloadFlatProducts(
  locale: Locale = defaultLocale,
): Promise<Product[]> {
  return loadPayloadFlatProductsCached(locale);
}
