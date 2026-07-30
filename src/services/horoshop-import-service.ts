import crypto from "node:crypto";
import type { Payload } from "payload";
import rawSource from "@/data/products.source.json";
import ukDictionary from "@/i18n/dictionaries/uk.json";
import {
  ProductSourceFileSchema,
  type ProductSourceRow,
  type Product as SourceProduct,
  type ShopCategory,
} from "@/lib/schemas/product";
import { groupProductSourceRows } from "@/lib/product-grouping";
import {
  mapSpecEntriesToPayloadSpecs,
  formatLeadTimeWeeksUk,
} from "@/lib/product-mapping";
import { shopCategoryDictionaryKeyMap } from "@/lib/shop-category-label";
import type {
  ImportMode,
  ImportBatchTotals,
} from "@/domain/import/import-batch";
import type {
  ImportEntityType,
  ImportWarningSeverity,
} from "@/domain/import/import-warning";

/**
 * Horoshop importer (Prompt 8 §1.3/§17, Phase G) — the real, one-way batch
 * job that turns `src/data/products.source.json` into Payload `Products`/
 * `Categories`/`Media`/`Redirects` documents, replacing the read-only
 * `horoshop-snapshot` bridge (`src/repositories/product-repository.
 * horoshop-snapshot.ts`) with a genuine Postgres-backed catalog. Once a
 * live run has completed, `CATALOG_SOURCE=payload` makes the rest of the
 * app read from what this importer wrote.
 *
 * Deliberately **not** `import "server-only"`: unlike every other
 * `-service.ts` in this app (only ever called from within the Next.js
 * server runtime), this one's primary caller is the plain Node CLI script
 * (`scripts/import-horoshop.ts`, Phase G) that runs *outside* Next's own
 * build — where the real `server-only` package (not an installed
 * dependency; only resolvable inside Next's webpack build) can't be
 * imported at all. For the same reason `payload` is a *required*
 * dependency here, not resolved via `getPayloadClient()`: the CLI
 * constructs its own `Payload` instance with `getPayload({ config })`
 * directly (same as the ad hoc `scripts-seed-tmp.mjs` this replaces).
 *
 * Idempotency/conflict policy (deliberately bounded, not a full 3-way
 * merge):
 *  - **Unchanged, skip.** A `sha256` checksum of the grouped source
 *    product is compared against the existing document's
 *    `legacy.sourceChecksum` — identical means nothing to do.
 *  - **Hand-authored, conflict.** If a document with the same SKU/
 *    category slug already exists but has no `legacy.importBatchId` at
 *    all, it was created by hand (or by the old ad hoc seed script), not
 *    by a prior import — the importer skips it entirely and logs a
 *    `conflict`-severity warning rather than silently overwriting
 *    someone's manual work.
 *  - **Price moved a lot, warn but proceed.** A >50% change in
 *    `basePrice` since the last import gets a `warning`-severity note
 *    (not a hard stop) — real re-pricing does happen.
 *  - **Never invents data.** Media is only attached when the real photo
 *    URL actually downloads; `specs`/lead-time/stock-note fields are only
 *    ever set from real parsed source text (see `product-mapping.ts`);
 *    `Colours`/`Materials` are never touched (§ see `legacyField.ts`'s
 *    own doc comment for why).
 */

/** Matches Payload's own `File` upload shape (`{data, mimetype, name, size}`) directly, so a downloaded photo can be passed straight through to `payload.create({..., file})`. */
export interface DownloadedPhoto {
  data: Buffer;
  mimetype: string;
  name: string;
  size: number;
}

export interface Dependencies {
  payload: Payload;
  /** Defaults to reading + validating `src/data/products.source.json`. Overridable so tests never touch the filesystem. */
  sourceRows?: ProductSourceRow[];
  now?: () => Date;
  /** Defaults to a real `fetch()` download. Overridable so tests never hit the network. */
  fetchPhoto?: (url: string) => Promise<DownloadedPhoto | null>;
}

export interface ImportOptions {
  mode: ImportMode;
  triggeredBy?: number;
  notes?: string;
}

export interface ImportRunResult {
  batchId: number;
  status: "completed" | "failed";
  totals: ImportBatchTotals;
}

function sha256(input: string): string {
  return crypto.createHash("sha256").update(input).digest("hex");
}

async function defaultFetchPhoto(url: string): Promise<DownloadedPhoto | null> {
  try {
    const response = await fetch(url);
    if (!response.ok) return null;
    const arrayBuffer = await response.arrayBuffer();
    const data = Buffer.from(arrayBuffer);
    const mimetype = response.headers.get("content-type") || "image/jpeg";
    const name = url.split("/").pop() || "photo.jpg";
    return { data, mimetype, name, size: data.byteLength };
  } catch {
    return null;
  }
}

/** Minimal shape this module reads off an existing Payload product/category — kept narrow rather than importing the full generated `Product`/`Category` types, since those are already re-exported elsewhere and this file only ever reads a handful of fields off them. */
interface ExistingLegacyDoc {
  id: number;
  slug?: string | null;
  basePrice?: number | null;
  mainImage?: unknown;
  gallery?: unknown[] | null;
  legacy?: {
    importBatchId?: unknown;
    sourceChecksum?: string | null;
  } | null;
}

async function recordWarning(
  payload: Payload,
  importBatch: number,
  entityType: ImportEntityType,
  legacyId: string,
  severity: ImportWarningSeverity,
  message: string,
): Promise<void> {
  await payload.create({
    collection: "import-warnings",
    overrideAccess: true,
    data: { importBatch, entityType, legacyId, severity, message },
  });
}

async function resolveCategoryId(
  payload: Payload,
  shopCategory: ShopCategory,
  dryRun: boolean,
  batchId: number,
  now: Date,
): Promise<number | undefined> {
  const existing = await payload.find({
    collection: "categories",
    where: { slug: { equals: shopCategory } },
    limit: 1,
    overrideAccess: true,
  });
  const existingDoc = existing.docs[0];
  if (existingDoc) return existingDoc.id;
  if (dryRun) return undefined;

  const name =
    ukDictionary.shopCategories[shopCategoryDictionaryKeyMap[shopCategory]];
  const created = await payload.create({
    collection: "categories",
    locale: "uk",
    overrideAccess: true,
    draft: false,
    data: {
      // See the matching comment on the product `data` object below for
      // why this is set explicitly rather than relying on `draft: false`.
      _status: "published",
      name,
      slug: shopCategory,
      sortOrder: 0,
      showInMenu: true,
      legacy: {
        legacySource: "horoshop",
        legacyId: shopCategory,
        importedAt: now.toISOString(),
        importBatchId: batchId,
        migrationStatus: "imported",
        migrationWarnings: [],
        sourceChecksum: sha256(JSON.stringify({ name, slug: shopCategory })),
      },
    },
  });
  return created.id;
}

function buildVariant(variant: SourceProduct["base"], customLabel?: string) {
  return {
    sku: variant.sku,
    price: variant.price,
    status: "madeToOrder" as const,
    optionAxes: customLabel ? { custom: customLabel } : undefined,
    leadTimeOverride:
      variant.leadTimeWeeks != null
        ? formatLeadTimeWeeksUk(variant.leadTimeWeeks)
        : undefined,
    stockNote: variant.mayBeOutOfStock
      ? "Може бути відсутня на складі."
      : undefined,
  };
}

export async function runHoroshopImport(
  options: ImportOptions,
  deps: Dependencies,
): Promise<ImportRunResult> {
  const payload = deps.payload;
  const now = deps.now ?? (() => new Date());
  const fetchPhoto = deps.fetchPhoto ?? defaultFetchPhoto;
  const dryRun = options.mode === "dryRun";

  const rows =
    deps.sourceRows ??
    ProductSourceFileSchema.parse(rawSource satisfies unknown[]);
  const products = groupProductSourceRows(rows);
  const rowBySku = new Map(rows.map((row) => [row.sku, row]));

  const batch = await payload.create({
    collection: "import-batches",
    overrideAccess: true,
    data: {
      source: "horoshop",
      mode: options.mode,
      status: "running",
      startedAt: now().toISOString(),
      totals: {
        createdCount: 0,
        updatedCount: 0,
        skippedCount: 0,
        conflictCount: 0,
        failedCount: 0,
      },
      triggeredBy: options.triggeredBy,
      notes: options.notes,
    },
  });

  // `ImportBatchTotals` (the domain type) is `Readonly<...>` by design —
  // this local accumulator is the one place that's allowed to mutate,
  // finalized into a real `ImportBatchTotals` only at the end.
  const totals = {
    createdCount: 0,
    updatedCount: 0,
    skippedCount: 0,
    conflictCount: 0,
    failedCount: 0,
  };

  // Tracks the resolved slug for every product this run created, updated,
  // or confirmed unchanged (i.e. everything *except* a conflict) — used
  // below to build real product-page redirects without guessing a target
  // for a hand-authored document we never touched.
  const resolvedSlugBySku = new Map<string, string>();

  for (const product of products) {
    try {
      const checksum = sha256(JSON.stringify(product));
      const baseRow = rowBySku.get(product.sku);

      const existingResult = await payload.find({
        collection: "products",
        where: { sku: { equals: product.sku } },
        limit: 1,
        overrideAccess: true,
      });
      const existingDoc = existingResult.docs[0] as unknown as
        ExistingLegacyDoc | undefined;

      if (existingDoc && !existingDoc.legacy?.importBatchId) {
        totals.conflictCount++;
        await recordWarning(
          payload,
          batch.id,
          "product",
          product.sku,
          "error",
          `Товар з SKU "${product.sku}" уже існує без даних імпорту (створений вручну) — пропущено, щоб не затерти ручні зміни.`,
        );
        continue;
      }

      if (existingDoc && existingDoc.legacy?.sourceChecksum === checksum) {
        totals.skippedCount++;
        resolvedSlugBySku.set(product.sku, existingDoc.slug || product.slug);
        continue;
      }

      if (existingDoc?.basePrice != null && existingDoc.basePrice > 0) {
        const ratio =
          Math.abs(product.base.price - existingDoc.basePrice) /
          existingDoc.basePrice;
        if (ratio > 0.5) {
          await recordWarning(
            payload,
            batch.id,
            "product",
            product.sku,
            "warning",
            `Ціна товару "${product.sku}" змінилась більш ніж на 50% (з ${existingDoc.basePrice} на ${product.base.price} грн).`,
          );
        }
      }

      if (dryRun) {
        if (existingDoc) totals.updatedCount++;
        else totals.createdCount++;
        resolvedSlugBySku.set(product.sku, product.slug);
        continue;
      }

      const categoryId = await resolveCategoryId(
        payload,
        product.shopCategory,
        dryRun,
        batch.id,
        now(),
      );
      if (categoryId == null) {
        throw new Error(
          `Не вдалося визначити/створити категорію "${product.shopCategory}"`,
        );
      }

      const variants = [buildVariant(product.base)];
      if (product.customColour)
        variants.push(
          buildVariant(product.customColour, product.customColour.colorLabel),
        );

      let mainImageId: number | undefined;
      if (!existingDoc?.mainImage) {
        const downloaded = await fetchPhoto(product.base.photo);
        if (downloaded) {
          const media = await payload.create({
            collection: "media",
            overrideAccess: true,
            data: { alt: product.name },
            file: downloaded,
          });
          mainImageId = media.id;
        } else {
          await recordWarning(
            payload,
            batch.id,
            "product",
            product.sku,
            "warning",
            `Не вдалося завантажити фото "${product.base.photo}" — товар імпортовано без mainImage.`,
          );
        }
      }

      let galleryIds: number[] | undefined;
      if (
        product.customColour &&
        !(existingDoc?.gallery && existingDoc.gallery.length > 0)
      ) {
        const downloaded = await fetchPhoto(product.customColour.photo);
        if (downloaded) {
          const media = await payload.create({
            collection: "media",
            overrideAccess: true,
            data: {
              alt: `${product.name} — ${product.customColour.colorLabel ?? "свій колір"}`,
            },
            file: downloaded,
          });
          galleryIds = [media.id];
        }
      }

      const data = {
        name: product.name,
        slug: product.slug,
        sku: product.sku,
        category: categoryId,
        // Payload's own version `_status` field (from `versions.drafts:
        // true`) defaults to "draft" for every new document regardless of
        // the `draft: false` create/update option — that option only
        // controls *how* the write is versioned, not this field's value.
        // Set it explicitly so an imported product shows as genuinely
        // published in the admin UI, matching `editorialStatus` below
        // (the actual field the rest of the app queries on).
        _status: "published" as const,
        editorialStatus: "published" as const,
        stockStatus: "madeToOrder" as const,
        shortDescription: product.base.description,
        specs: mapSpecEntriesToPayloadSpecs(product.specEntries),
        basePrice: product.base.price,
        ...(baseRow?.alias ? { oldUrl: `/${baseRow.alias}` } : {}),
        variants,
        ...(mainImageId != null ? { mainImage: mainImageId } : {}),
        ...(galleryIds ? { gallery: galleryIds } : {}),
        legacy: {
          legacySource: "horoshop" as const,
          legacyId: product.sku,
          ...(baseRow?.alias
            ? {
                legacyUrl: `https://odudlab.com/${baseRow.alias}`,
                legacySlug: baseRow.alias,
              }
            : {}),
          importedAt: now().toISOString(),
          importBatchId: batch.id,
          migrationStatus: existingDoc
            ? ("updated" as const)
            : ("imported" as const),
          migrationWarnings: [],
          sourceChecksum: checksum,
        },
      };

      // `draft: false` — this product's own `editorialStatus` field (set
      // above) is the real publish gate the rest of the app queries on,
      // but the collection also has Payload's own `versions.drafts: true`
      // enabled; without `draft: false` a freshly-created doc's version
      // `_status` defaults to "draft", which would show every imported
      // product with a misleading "Draft" badge in the admin UI even
      // though it's already live on the site.
      if (existingDoc) {
        await payload.update({
          collection: "products",
          id: existingDoc.id,
          locale: "uk",
          overrideAccess: true,
          draft: false,
          data,
        });
        totals.updatedCount++;
      } else {
        await payload.create({
          collection: "products",
          locale: "uk",
          overrideAccess: true,
          draft: false,
          data,
        });
        totals.createdCount++;
      }
      resolvedSlugBySku.set(product.sku, product.slug);
    } catch (error) {
      totals.failedCount++;
      await recordWarning(
        payload,
        batch.id,
        "product",
        product.sku,
        "error",
        `Помилка імпорту товару "${product.sku}": ${error instanceof Error ? error.message : String(error)}`,
      );
    }
  }

  // Real old-URL redirects, built from every source row's own `alias`
  // (base *and* custom-colour rows each had a distinct old URL on the old
  // site) — never fabricated, and never pointed at a product this run
  // didn't actually resolve a real slug for (skips a conflicted product's
  // guessed slug rather than risk a redirect to the wrong page).
  if (!dryRun) {
    for (const row of rows) {
      if (!row.alias) continue;
      const groupKey = row.parentSku || row.sku;
      const slug = resolvedSlugBySku.get(groupKey);
      if (!slug) continue;

      const fromPath = `/${row.alias}`;
      const existingRedirect = await payload.find({
        collection: "redirects",
        where: { fromPath: { equals: fromPath } },
        limit: 1,
        overrideAccess: true,
      });
      if (existingRedirect.docs.length > 0) continue;

      await payload.create({
        collection: "redirects",
        overrideAccess: true,
        data: {
          fromPath,
          // Unprefixed: `uk` is this site's default locale, and proxy.ts only
          // ever rewrites unprefixed paths to /uk/... internally — a visible
          // /uk/... URL 404s. See src/proxy.ts + src/lib/legacy-redirects.ts.
          toPath: `/products/${slug}`,
          statusCode: "301",
          active: true,
          note: `Імпортовано Horoshop-імпортером (batch ${batch.id}).`,
        },
      });
    }
  }

  await payload.update({
    collection: "import-batches",
    id: batch.id,
    overrideAccess: true,
    data: {
      status: "completed",
      finishedAt: now().toISOString(),
      totals,
    },
  });

  return { batchId: batch.id, status: "completed", totals };
}
