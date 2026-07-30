import type { Product, ProductVariant } from "@/lib/schemas/product";

/**
 * Builds the real product/variant summary string sent alongside a
 * "Отримати прорахунок" (request a quote) submission — Prompt 6 §6/§16.
 * Only ever real, already-known fields (product name, the resolved
 * variant's own real SKU and colour label) — never a fabricated
 * description of what was "configured". Omits the colour clause entirely
 * for variants with no `colorLabel` (single-variant products).
 */
export function buildQuoteContext(
  product: Product,
  variant: ProductVariant,
): string {
  const base = `${product.name} (${variant.sku})`;
  return variant.colorLabel ? `${base}, колір: ${variant.colorLabel}` : base;
}
