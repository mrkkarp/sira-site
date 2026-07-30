import "server-only";
import {
  getAllProducts,
  getProductsByCategory,
  getProductBySlug,
} from "@/lib/products";
import {
  ShopCategorySchema,
  type Product as LegacyProduct,
  type ProductVariant as LegacyVariant,
} from "@/lib/schemas/product";
import { ProductId, VariantId, CategoryId } from "@/domain/shared/ids";
import { moneyFromDecimal } from "@/domain/shared/money";
import type { Product } from "@/domain/catalog/product";
import type { ProductSpecification } from "@/domain/catalog/product-specification";
import type { ProductVariant } from "@/domain/catalog/product-variant";
import type { ProductRepository } from "./product-repository";

/**
 * Pure mapper: legacy `Product` (grouped Horoshop export rows, see
 * `src/lib/schemas/product.ts`) -> domain `Product`. Kept as a
 * standalone exported function (no repository/IO in here) per §0's
 * "мапери — чисті функції без побічних ефектів, покриті тестами"
 * requirement — `product-repository.horoshop-snapshot.test.ts` covers
 * this directly with fixture data, no filesystem/DB involved.
 *
 * Known, accepted gaps (this is a *bridge* over legacy data, not the
 * real migration — Phase G's Horoshop importer is the real one):
 *  - `mainMediaId`/`galleryMediaIds`/variant `mediaIds` are always
 *    `undefined`: the legacy `photo` field is a plain URL string, not a
 *    Payload `Media` document, so there is no honest `MediaId` to put
 *    there. The existing storefront components render `base.photo`
 *    directly from the legacy shape today — this mapper doesn't change
 *    that, it only makes an equivalent typed `Product` available for
 *    new code that wants one.
 *  - `legacy` (import metadata) is left `undefined`: that field
 *    describes "this record was produced by a specific Horoshop import
 *    batch", which literally hasn't happened yet for this data — this
 *    repository reads the JSON snapshot live on every call, it isn't
 *    itself an import. Fabricating an `importedAt`/`importBatchId`
 *    would misrepresent that.
 *  - `availableColourIds`/`options` are `undefined`: the legacy shape
 *    only has a free-text `colorLabel` per variant, not a real `Colour`
 *    entity or a `ProductOption` axis definition.
 */
export function mapSnapshotProductToDomain(source: LegacyProduct): Product {
  const productId = ProductId.parse(source.slug);
  const categoryId = CategoryId.parse(source.shopCategory);

  const specifications: ProductSpecification[] = [
    ...(source.sinkType
      ? [textSpec("sinkType", "Тип монтажу", source.sinkType)]
      : []),
    ...(source.planterPlacement
      ? [textSpec("planterPlacement", "Розміщення", source.planterPlacement)]
      : []),
    ...(source.outdoorType
      ? [textSpec("outdoorType", "Тип виробу", source.outdoorType)]
      : []),
    ...(source.heightCm
      ? [measurementSpec("heightCm", "Висота", source.heightCm, "cm")]
      : []),
    ...(source.widthCm
      ? [measurementSpec("widthCm", "Ширина", source.widthCm, "cm")]
      : []),
    ...source.specEntries.map((entry, index) =>
      textSpec(`legacySpec${index}`, entry.label, entry.value),
    ),
  ];

  const variants: ProductVariant[] = [mapVariant(source.base, productId)];
  if (source.customColour) {
    variants.push(mapVariant(source.customColour, productId));
  }

  return {
    id: productId,
    slug: source.slug,
    sku: source.sku,
    name: { uk: source.name },
    shortDescription: source.base.description
      ? { uk: source.base.description }
      : undefined,
    categoryId,
    availableColourIds: undefined,
    mainMediaId: undefined,
    galleryMediaIds: undefined,
    documentIds: undefined,
    specifications: specifications.length > 0 ? specifications : undefined,
    options: undefined,
    variants,
    basePrice: moneyFromDecimal("UAH", source.base.price),
    editorialStatus: "published",
    stockStatus: "madeToOrder",
    leadTime: undefined,
    seo: undefined,
    legacy: undefined,
  };
}

function mapVariant(
  variant: LegacyVariant,
  productId: Product["id"],
): ProductVariant {
  return {
    id: VariantId.parse(variant.sku),
    productId,
    sku: variant.sku,
    selectedOptions: variant.colorLabel
      ? [{ optionKey: "colour", value: variant.colorLabel }]
      : [],
    price: moneyFromDecimal("UAH", variant.price),
    inventory: { status: "madeToOrder" },
    leadTime:
      variant.leadTimeWeeks !== undefined
        ? {
            minDays: Math.round(variant.leadTimeWeeks * 7),
            maxDays: Math.round(variant.leadTimeWeeks * 7),
          }
        : undefined,
    mediaIds: undefined,
    documentIds: undefined,
    stockNote: variant.mayBeOutOfStock
      ? { uk: "Можлива тимчасова відсутність — уточнюйте." }
      : undefined,
  };
}

function textSpec(
  key: string,
  label: string,
  value: string,
): ProductSpecification {
  return { kind: "text", key, label: { uk: label }, value: { uk: value } };
}

function measurementSpec(
  key: string,
  label: string,
  value: number,
  unit: string,
): ProductSpecification {
  return { kind: "measurement", key, label: { uk: label }, value, unit };
}

export class HoroshopSnapshotProductRepository implements ProductRepository {
  async findAll(): Promise<Product[]> {
    return getAllProducts().map(mapSnapshotProductToDomain);
  }

  async findBySlug(slug: string): Promise<Product | null> {
    const found = getProductBySlug(slug);
    return found ? mapSnapshotProductToDomain(found) : null;
  }

  async findByCategorySlug(categorySlug: string): Promise<Product[]> {
    const parsed = ShopCategorySchema.safeParse(categorySlug);
    if (!parsed.success) return [];
    return getProductsByCategory(parsed.data).map(mapSnapshotProductToDomain);
  }

  /** `ProductId` is parsed directly from `slug` for this legacy bridge (see `mapSnapshotProductToDomain` above), so an id lookup here is just a slug lookup by another name. */
  async findById(id: ProductId): Promise<Product | null> {
    return this.findBySlug(id);
  }
}
