import "server-only";
import {
  getProductRepository,
  type ProductRepository,
} from "@/repositories/product-repository";
import type { Product } from "@/domain/catalog/product";
import type { ProductVariant } from "@/domain/catalog/product-variant";
import type { ProductId } from "@/domain/shared/ids";
import {
  buildVariantIndex,
  resolveVariant,
  resolveVariantForProduct,
  effectivePrice,
  isVariantOrderable,
  type ResolvedVariant,
  type VariantSelection,
} from "@/domain/catalog/variant-resolver";
import type { Money } from "@/domain/shared/money";

/**
 * `ProductService` (Prompt 8 §3, Phase C) — the use-case facade above
 * `ProductRepository`. Unlike the repository layer (which swaps
 * *storage backend*, e.g. Payload vs. the legacy JSON snapshot), this
 * module has exactly one implementation: it exists to keep the
 * variant-resolution/pricing rules in one place rather than re-derived
 * ad hoc at every call site (a page, a cart action, a checkout step).
 *
 * Every export takes an optional `repository` param instead of always
 * calling the module-level `getProductRepository()` singleton — this
 * is the seam that lets tests inject an in-memory fake `ProductRepository`
 * without touching the real `CATALOG_SOURCE` env var/factory cache.
 */

async function resolveRepository(
  repository?: ProductRepository,
): Promise<ProductRepository> {
  return repository ?? (await getProductRepository());
}

export async function getProductBySlug(
  slug: string,
  repository?: ProductRepository,
): Promise<Product | null> {
  const repo = await resolveRepository(repository);
  return repo.findBySlug(slug);
}

/** Looked up by `ProductId`, not slug — the only call site today is the cart service (Phase D) re-validating a `CartLine.productId`, which never has the slug in hand. */
export async function getProductById(
  id: ProductId,
  repository?: ProductRepository,
): Promise<Product | null> {
  const repo = await resolveRepository(repository);
  return repo.findById(id);
}

export async function listProducts(
  repository?: ProductRepository,
): Promise<Product[]> {
  const repo = await resolveRepository(repository);
  return repo.findAll();
}

export async function listProductsByCategory(
  categorySlug: string,
  repository?: ProductRepository,
): Promise<Product[]> {
  const repo = await resolveRepository(repository);
  return repo.findByCategorySlug(categorySlug);
}

export type VariantResolutionResult =
  { status: "notFound" } | (ResolvedVariant & { product: Product });

/**
 * Fetches the product fresh from the repository and resolves the
 * variant against *that* live read — never against a price/selection
 * the caller already has in hand. This is the one function the cart
 * service (Phase D) and checkout/order service (Phase F) are meant to
 * call before trusting a price or availability claim from the client,
 * per §7/§13's "завжди перевіряй ціну і наявність на сервері".
 */
export async function resolveVariantBySlug(
  slug: string,
  selection: VariantSelection,
  repository?: ProductRepository,
): Promise<VariantResolutionResult> {
  const product = await getProductBySlug(slug, repository);
  if (!product) return { status: "notFound" };
  const resolution = resolveVariantForProduct(product, selection);
  return { ...resolution, product };
}

export {
  buildVariantIndex,
  resolveVariant,
  effectivePrice,
  isVariantOrderable,
};
export type { ResolvedVariant, VariantSelection };

/** The price + orderability a cart/checkout call site actually needs, bundled — saves every caller re-deriving both from a `ProductVariant` by hand. */
export function priceAndAvailability(
  product: Product,
  variant: ProductVariant,
): { price: Money | null; orderable: boolean } {
  return {
    price: effectivePrice(product, variant),
    orderable: isVariantOrderable(variant),
  };
}
