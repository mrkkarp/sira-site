import { z } from "zod";

/**
 * Branded ID registry (Prompt 8 §2).
 *
 * Deliberately centralized in one file, unlike the entity models
 * themselves (which are split by domain area per the spec's own "не
 * створюй один файл на тисячі рядків" rule): every ID here is a
 * one-line branded string with no business logic attached, and keeping
 * them in one place avoids import cycles between `catalog`/`content`/
 * `ecommerce`/`leads` (e.g. a `CartLine` references `ProductId` +
 * `VariantId`; `SEOData` references `MediaId`; `Order` references
 * `PromoCodeId`). At runtime every ID is a plain non-empty string —
 * the brand only exists so TypeScript refuses to let a `CategoryId`
 * be passed where a `ProductId` is expected, even though both are
 * strings under the hood.
 */
function brandedId<Brand extends string>() {
  return z.string().min(1).brand<Brand>();
}

// Catalog
export const ProductId = brandedId<"ProductId">();
export type ProductId = z.infer<typeof ProductId>;
export const VariantId = brandedId<"VariantId">();
export type VariantId = z.infer<typeof VariantId>;
export const OptionId = brandedId<"OptionId">();
export type OptionId = z.infer<typeof OptionId>;
export const MediaId = brandedId<"MediaId">();
export type MediaId = z.infer<typeof MediaId>;
export const DocumentId = brandedId<"DocumentId">();
export type DocumentId = z.infer<typeof DocumentId>;
export const CategoryId = brandedId<"CategoryId">();
export type CategoryId = z.infer<typeof CategoryId>;
export const CollectionId = brandedId<"CollectionId">();
export type CollectionId = z.infer<typeof CollectionId>;
export const ColourId = brandedId<"ColourId">();
export type ColourId = z.infer<typeof ColourId>;
export const MaterialId = brandedId<"MaterialId">();
export type MaterialId = z.infer<typeof MaterialId>;

// Content
export const PageId = brandedId<"PageId">();
export type PageId = z.infer<typeof PageId>;
export const PageBlockId = brandedId<"PageBlockId">();
export type PageBlockId = z.infer<typeof PageBlockId>;
export const ProjectId = brandedId<"ProjectId">();
export type ProjectId = z.infer<typeof ProjectId>;
export const ArticleId = brandedId<"ArticleId">();
export type ArticleId = z.infer<typeof ArticleId>;
export const FAQItemId = brandedId<"FAQItemId">();
export type FAQItemId = z.infer<typeof FAQItemId>;
export const StockistId = brandedId<"StockistId">();
export type StockistId = z.infer<typeof StockistId>;
export const ResourceId = brandedId<"ResourceId">();
export type ResourceId = z.infer<typeof ResourceId>;
export const NavigationItemId = brandedId<"NavigationItemId">();
export type NavigationItemId = z.infer<typeof NavigationItemId>;

// Ecommerce
export const CartId = brandedId<"CartId">();
export type CartId = z.infer<typeof CartId>;
export const CartLineId = brandedId<"CartLineId">();
export type CartLineId = z.infer<typeof CartLineId>;
export const OrderId = brandedId<"OrderId">();
export type OrderId = z.infer<typeof OrderId>;
export const OrderLineId = brandedId<"OrderLineId">();
export type OrderLineId = z.infer<typeof OrderLineId>;
export const PaymentId = brandedId<"PaymentId">();
export type PaymentId = z.infer<typeof PaymentId>;
export const PromoCodeId = brandedId<"PromoCodeId">();
export type PromoCodeId = z.infer<typeof PromoCodeId>;

// Leads — one shared ID: `Leads` is a single table/collection (§3.1)
// discriminated by a `type` field, not six separate entity tables.
export const LeadId = brandedId<"LeadId">();
export type LeadId = z.infer<typeof LeadId>;

// Migration
export const ImportBatchId = brandedId<"ImportBatchId">();
export type ImportBatchId = z.infer<typeof ImportBatchId>;
export const ImportWarningId = brandedId<"ImportWarningId">();
export type ImportWarningId = z.infer<typeof ImportWarningId>;
