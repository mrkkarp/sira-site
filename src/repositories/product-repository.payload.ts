import "server-only";
import type { Product as PayloadProduct } from "@/payload-types";
import { getPayloadClient } from "@/lib/payload-client";
import {
  ProductId,
  VariantId,
  CategoryId,
  ColourId,
  MediaId,
  DocumentId,
  ImportBatchId,
} from "@/domain/shared/ids";
import { moneyFromDecimal } from "@/domain/shared/money";
import {
  LegacyMetadataSchema,
  type LegacyMetadata,
} from "@/domain/shared/legacy";
import {
  localeAllToLocaleContent,
  localeAllToOptionalLocaleContent,
  type LocaleAllValue,
} from "./locale-all";
import { ProductSchema, type Product } from "@/domain/catalog/product";
import type { ProductSpecification } from "@/domain/catalog/product-specification";
import type {
  ProductVariant,
  SelectedOption,
} from "@/domain/catalog/product-variant";
import type { LeadTime } from "@/domain/shared/lead-time";
import type { InventoryStatus } from "@/domain/shared/inventory-status";
import type { SEOData } from "@/domain/shared/seo";
import type { ProductOptionKey } from "@/domain/catalog/product-option";
import type { ProductRepository } from "./product-repository";

type PayloadSpecs = NonNullable<PayloadProduct["specs"]>;

/** `specs.*` fields that are free text (possibly `localized: true`, hence read through `LocaleAllValue`). */
const TEXT_SPEC_FIELDS: Array<{ key: keyof PayloadSpecs; label: string }> = [
  { key: "material", label: "Матеріал" },
  { key: "technology", label: "Технологія" },
  { key: "reinforcement", label: "Армування" },
  { key: "coating", label: "Покриття" },
  { key: "mountType", label: "Тип монтажу" },
  { key: "faucetType", label: "Тип змішувача" },
  { key: "faucetHole", label: "Отвір під змішувач" },
  { key: "overflow", label: "Перелив" },
  { key: "wallConnection", label: "Підключення (стіна)" },
  { key: "floorConnection", label: "Підключення (підлога)" },
  { key: "drainage", label: "Дренаж" },
  { key: "fixingMethod", label: "Спосіб кріплення" },
  { key: "packagingType", label: "Тип пакування" },
  { key: "warranty", label: "Гарантія" },
  { key: "care", label: "Догляд" },
  { key: "countryOfOrigin", label: "Країна виробництва" },
];

/** `specs.*` fields that are a `{ value, unit }` measurement pair. */
const MEASUREMENT_SPEC_FIELDS: Array<{
  key: keyof PayloadSpecs;
  label: string;
}> = [
  { key: "width", label: "Ширина" },
  { key: "depth", label: "Глибина" },
  { key: "height", label: "Висота" },
  { key: "diameter", label: "Діаметр" },
  { key: "thickness", label: "Товщина" },
  { key: "weightPerArea", label: "Вага на м²" },
  { key: "drainDiameter", label: "Діаметр зливного отвору" },
  { key: "coverageArea", label: "Площа покриття" },
  { key: "piecesPerPack", label: "Штук в упаковці" },
];

function relationId(
  value: number | { id: number } | null | undefined,
): string | null {
  if (value == null) return null;
  return String(typeof value === "number" ? value : value.id);
}

function mapSpecifications(
  specs: PayloadProduct["specs"],
): ProductSpecification[] {
  if (!specs) return [];
  const out: ProductSpecification[] = [];

  for (const { key, label } of TEXT_SPEC_FIELDS) {
    const content = localeAllToOptionalLocaleContent(
      specs[key] as unknown as LocaleAllValue,
    );
    if (content)
      out.push({ kind: "text", key, label: { uk: label }, value: content });
  }

  for (const { key, label } of MEASUREMENT_SPEC_FIELDS) {
    const raw = specs[key] as unknown as
      { value?: number | null; unit?: string | null } | undefined;
    if (raw?.value != null && raw.unit) {
      out.push({
        kind: "measurement",
        key,
        label: { uk: label },
        value: raw.value,
        unit: raw.unit,
      });
    }
  }

  // `weight` uses the "kg" unit family — handled separately only because
  // it's typed distinctly from the others in `payload-types.ts`, not for
  // any domain-level reason.
  if (specs.weight?.value != null && specs.weight.unit) {
    out.push({
      kind: "measurement",
      key: "weight",
      label: { uk: "Вага" },
      value: specs.weight.value,
      unit: specs.weight.unit,
    });
  }

  if (specs.usage && specs.usage.length > 0) {
    out.push({
      kind: "text",
      key: "usage",
      label: { uk: "Використання" },
      value: { uk: specs.usage.join(", ") },
    });
  }

  return out;
}

function mapInventoryStatus(
  status: string | null | undefined,
  reason?: string,
): InventoryStatus {
  switch (status) {
    case "inStock":
      return { status: "inStock" };
    case "availableForOrder":
      return { status: "availableForOrder" };
    case "quoteOnly":
      return { status: "quoteOnly" };
    case "unavailable":
      return { status: "unavailable", reason };
    case "madeToOrder":
    default:
      return { status: "madeToOrder" };
  }
}

function mapLeadTime(
  group: PayloadProduct["leadTimeDays"],
): LeadTime | undefined {
  if (!group) return undefined;
  const textOverride = localeAllToOptionalLocaleContent(
    group.textOverride as unknown as LocaleAllValue,
  );
  const hasAny =
    group.min != null ||
    group.max != null ||
    Boolean(textOverride) ||
    group.urgentLeadTimeDays != null ||
    Boolean(group.productionCapacityStatus) ||
    Boolean(group.temporaryExtensionUntil);
  if (!hasAny) return undefined;
  return {
    minDays: group.min ?? null,
    maxDays: group.max ?? null,
    textOverride,
    urgentDays: group.urgentLeadTimeDays ?? null,
    productionCapacityStatus: group.productionCapacityStatus ?? undefined,
    temporaryExtensionUntil: group.temporaryExtensionUntil ?? undefined,
  };
}

function mapVariantOptions(
  axes: NonNullable<PayloadProduct["variants"]>[number]["optionAxes"],
): SelectedOption[] {
  if (!axes) return [];
  const out: SelectedOption[] = [];
  const push = (
    optionKey: ProductOptionKey,
    value: string | null | undefined,
  ) => {
    if (value) out.push({ optionKey, value });
  };
  // `colour` is a real relationship (see `Products.ts`) — its
  // `SelectedOption.value` is the stringified `ColourId`, a machine key
  // for `resolveVariant()` to match against, not a display label (the
  // display label comes from the `Colour` entity itself, looked up
  // separately by whatever renders the selection).
  const colourId = relationId(axes.colour);
  if (colourId) push("colour", colourId);
  push("size", axes.size);
  push("material", axes.material);
  push("coating", axes.coating);
  push("mount", axes.mount);
  push("faucetType", axes.faucetType);
  push("hole", axes.hole);
  push("overflow", axes.overflow);
  push("connection", axes.connection);
  push("kit", axes.kit);
  push("custom", axes.custom);
  return out;
}

function mapVariants(
  doc: PayloadProduct,
  productId: Product["id"],
): ProductVariant[] {
  const rows = doc.variants ?? [];

  if (rows.length === 0) {
    // `ProductVariantSchema`'s own doc comment: `variants` must never be
    // empty. A product with no configured variant rows still gets one
    // synthesized "default" variant carrying what would otherwise live
    // directly on `Product` (its own `sku`/`basePrice`/`stockStatus`).
    return [
      {
        id: VariantId.parse(doc.sku),
        productId,
        sku: doc.sku,
        selectedOptions: [],
        price:
          doc.basePrice != null ? moneyFromDecimal("UAH", doc.basePrice) : null,
        inventory: mapInventoryStatus(doc.stockStatus),
        leadTime: mapLeadTime(doc.leadTimeDays),
        mediaIds: undefined,
        documentIds: undefined,
        stockNote: undefined,
      },
    ];
  }

  return rows.map((row) => {
    const stockNote = localeAllToOptionalLocaleContent(
      row.stockNote as unknown as LocaleAllValue,
    );
    return {
      id: VariantId.parse(row.id || row.sku),
      productId,
      sku: row.sku,
      selectedOptions: mapVariantOptions(row.optionAxes),
      price: row.price != null ? moneyFromDecimal("UAH", row.price) : null,
      inventory: mapInventoryStatus(row.status, stockNote?.uk),
      leadTime: row.leadTimeOverride
        ? {
            minDays: null,
            maxDays: null,
            textOverride: localeAllToOptionalLocaleContent(
              row.leadTimeOverride as unknown as LocaleAllValue,
            ),
          }
        : undefined,
      mediaIds: (row.photos ?? []).map((p) =>
        MediaId.parse(relationId(p) ?? ""),
      ),
      documentIds: (row.documents ?? []).map((d) =>
        DocumentId.parse(relationId(d) ?? ""),
      ),
      stockNote,
    } satisfies ProductVariant;
  });
}

function mapSeo(seo: PayloadProduct["seo"]): SEOData | undefined {
  if (!seo) return undefined;
  const metaTitle = localeAllToOptionalLocaleContent(
    seo.metaTitle as unknown as LocaleAllValue,
  );
  const metaDescription = localeAllToOptionalLocaleContent(
    seo.metaDescription as unknown as LocaleAllValue,
  );
  const ogImageId = relationId(seo.ogImage);
  const oldUrls = seo.oldUrls?.map((entry) => entry.url);
  const hasAny =
    Boolean(metaTitle) ||
    Boolean(metaDescription) ||
    Boolean(seo.focusKeyword) ||
    Boolean(ogImageId) ||
    Boolean(seo.canonicalUrl) ||
    Boolean(seo.noIndex) ||
    Boolean(oldUrls?.length);
  if (!hasAny) return undefined;
  return {
    metaTitle,
    metaDescription,
    focusKeyword: seo.focusKeyword ?? undefined,
    ogImageId: ogImageId ? MediaId.parse(ogImageId) : undefined,
    canonicalUrl: seo.canonicalUrl ?? undefined,
    noIndex: seo.noIndex ?? false,
    oldUrls,
  };
}

/**
 * Reads back the `legacy` metadata group the Horoshop importer
 * (`src/services/horoshop-import-service.ts`) writes at import time.
 * Returns `undefined` for hand-authored documents the importer never
 * touched (e.g. demo seed data) — a partially-filled `legacy` group (any
 * required sub-field missing) is treated the same way, since that can
 * only happen for a document the importer didn't write.
 */
function mapLegacy(
  legacy: PayloadProduct["legacy"],
): LegacyMetadata | undefined {
  if (
    !legacy ||
    !legacy.legacySource ||
    !legacy.legacyId ||
    !legacy.importedAt ||
    !legacy.importBatchId ||
    !legacy.migrationStatus ||
    !legacy.sourceChecksum
  ) {
    return undefined;
  }
  const importBatchId = relationId(legacy.importBatchId);
  if (!importBatchId) return undefined;

  return LegacyMetadataSchema.parse({
    legacySource: legacy.legacySource,
    legacyId: legacy.legacyId,
    legacyUrl: legacy.legacyUrl ?? undefined,
    legacySlug: legacy.legacySlug ?? undefined,
    importedAt: legacy.importedAt,
    importBatchId: ImportBatchId.parse(importBatchId),
    migrationStatus: legacy.migrationStatus,
    migrationWarnings: (legacy.migrationWarnings ?? []).map(
      (entry) => entry.warning,
    ),
    sourceChecksum: legacy.sourceChecksum,
  });
}

/**
 * Payload/Postgres-backed mapper: Payload's generated `Product` type ->
 * domain `Product`. The caller must fetch with `locale: "all"` (so
 * localized fields come back as `{uk, en?, pl?}`, see `./locale-all.ts`)
 * and `depth: 0` (so relationships come back as bare IDs, which is all
 * this mapper ever reads — it never dereferences a populated relation).
 * Ends with `ProductSchema.parse(...)` so a shape mismatch between this
 * mapper and the domain model fails loudly here, not silently downstream.
 */
export function mapPayloadProductToDomain(doc: PayloadProduct): Product {
  const productId = ProductId.parse(String(doc.id));
  const categoryId = CategoryId.parse(relationId(doc.category) ?? "");
  const availableColourIds = (doc.availableColours ?? [])
    .map((colour) => relationId(colour))
    .filter((id): id is string => Boolean(id))
    .map((id) => ColourId.parse(id));
  const galleryMediaIds = (doc.gallery ?? [])
    .map((media) => relationId(media))
    .filter((id): id is string => Boolean(id))
    .map((id) => MediaId.parse(id));
  const documentIds = (doc.documents ?? [])
    .map((document) => relationId(document))
    .filter((id): id is string => Boolean(id))
    .map((id) => DocumentId.parse(id));
  const mainMediaId = relationId(doc.mainImage);
  const specifications = mapSpecifications(doc.specs);

  const mapped: Product = {
    id: productId,
    slug: doc.slug,
    sku: doc.sku,
    name: localeAllToLocaleContent(
      doc.name as unknown as LocaleAllValue,
      doc.slug,
    ),
    shortDescription: localeAllToOptionalLocaleContent(
      doc.shortDescription as unknown as LocaleAllValue,
    ),
    categoryId,
    collectionIds: undefined,
    availableColourIds:
      availableColourIds.length > 0 ? availableColourIds : undefined,
    mainMediaId: mainMediaId ? MediaId.parse(mainMediaId) : null,
    galleryMediaIds: galleryMediaIds.length > 0 ? galleryMediaIds : undefined,
    documentIds: documentIds.length > 0 ? documentIds : undefined,
    specifications: specifications.length > 0 ? specifications : undefined,
    options: undefined,
    variants: mapVariants(doc, productId),
    basePrice:
      doc.basePrice != null ? moneyFromDecimal("UAH", doc.basePrice) : null,
    editorialStatus: doc.editorialStatus,
    stockStatus: doc.stockStatus,
    leadTime: mapLeadTime(doc.leadTimeDays),
    seo: mapSeo(doc.seo),
    legacy: mapLegacy(doc.legacy),
  };

  return ProductSchema.parse(mapped);
}

export class PayloadProductRepository implements ProductRepository {
  async findAll(): Promise<Product[]> {
    const payload = await getPayloadClient();
    const result = await payload.find({
      collection: "products",
      where: { editorialStatus: { equals: "published" } },
      locale: "all",
      depth: 0,
      limit: 0,
      overrideAccess: true,
    });
    return (result.docs as unknown as PayloadProduct[]).map(
      mapPayloadProductToDomain,
    );
  }

  async findBySlug(slug: string): Promise<Product | null> {
    const payload = await getPayloadClient();
    const result = await payload.find({
      collection: "products",
      where: { slug: { equals: slug } },
      locale: "all",
      depth: 0,
      limit: 1,
      overrideAccess: true,
    });
    const doc = result.docs[0] as unknown as PayloadProduct | undefined;
    return doc ? mapPayloadProductToDomain(doc) : null;
  }

  async findById(id: ProductId): Promise<Product | null> {
    const payload = await getPayloadClient();
    const doc = await payload.findByID({
      collection: "products",
      id: Number(id),
      locale: "all",
      depth: 0,
      overrideAccess: true,
      disableErrors: true,
    });
    return doc
      ? mapPayloadProductToDomain(doc as unknown as PayloadProduct)
      : null;
  }

  async findByCategorySlug(categorySlug: string): Promise<Product[]> {
    const payload = await getPayloadClient();
    const categories = await payload.find({
      collection: "categories",
      where: { slug: { equals: categorySlug } },
      limit: 1,
      overrideAccess: true,
    });
    const category = categories.docs[0];
    if (!category) return [];

    const result = await payload.find({
      collection: "products",
      where: {
        category: { equals: category.id },
        editorialStatus: { equals: "published" },
      },
      locale: "all",
      depth: 0,
      limit: 0,
      overrideAccess: true,
    });
    return (result.docs as unknown as PayloadProduct[]).map(
      mapPayloadProductToDomain,
    );
  }
}
