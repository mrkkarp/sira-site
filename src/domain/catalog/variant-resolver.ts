import type { Product } from "./product";
import type { ProductVariant } from "./product-variant";
import type { ProductOptionKey } from "./product-option";
import { isOrderable } from "../shared/inventory-status";
import type { Money } from "../shared/money";

/**
 * `resolveVariant()` (Prompt 8 §7, Phase C) — the one place a customer's
 * option selection turns into a concrete `ProductVariant`, or an
 * explanation of why it can't yet. Deliberately no nested `if`-chains
 * per product type (§7's explicit "не створюй вкладені ланцюги if для
 * кожної моделі товару"): every product, regardless of how many real
 * option axes it has, goes through the exact same
 * `buildVariantIndex()` -> `resolveVariant()` pipeline, because
 * `Product.variants` is guaranteed non-empty (see `product.ts`) — a
 * product with zero real axes still has one variant with an empty
 * `selectedOptions` array, matched by the empty selection.
 *
 * Mirrors the shape of the pre-existing legacy resolver in
 * `src/lib/variant-model.ts` (build an index once, resolve many times
 * against it) but cannot reuse its types: the legacy model keys
 * selections by an ad-hoc per-product `optionId`/`choiceId` pair,
 * whereas the domain model's `SelectedOption` is already keyed by the
 * closed `ProductOptionKey` enum — no per-product option ids needed.
 */
export type VariantSelection = Partial<Record<ProductOptionKey, string>>;

export type ResolvedVariant =
  /** The selection is missing a value for at least one option axis the product actually has. */
  | { status: "incomplete"; missingOptionKeys: ProductOptionKey[] }
  /** Every axis has a valid value, but no variant row matches that exact combination — a real gap in the catalog data, not a UI bug. */
  | { status: "unavailableCombination"; selection: VariantSelection }
  /** A matching variant was found. Its own `inventory.status` (see `isOrderable()`) still decides whether it can actually be added to cart right now. */
  | { status: "resolved"; variant: ProductVariant };

/** Stable, sort-independent cache key for a set of `(optionKey, value)` pairs — same trick as `variantSelectionKey()` in the legacy resolver. */
function selectionKey(
  entries: ReadonlyArray<readonly [ProductOptionKey, string]>,
): string {
  return entries
    .slice()
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([key, value]) => `${key}:${value}`)
    .join("|");
}

export interface VariantIndex {
  readonly product: Product;
  /** Option keys the product actually defines an axis for — anything not listed here is ignored if present in a selection, and never counted as "missing". */
  readonly requiredOptionKeys: readonly ProductOptionKey[];
  readonly variantsByKey: ReadonlyMap<string, ProductVariant>;
}

/**
 * Builds the lookup table once per `product` so a UI can call
 * `resolveVariant()` on every keystroke/click without re-scanning
 * `variants` each time (mirrors `buildVariantModel()`'s role for the
 * legacy resolver — callers typically wrap this in `useMemo(() =>
 * buildVariantIndex(product), [product])`).
 */
export function buildVariantIndex(product: Product): VariantIndex {
  const variantsByKey = new Map<string, ProductVariant>();
  for (const variant of product.variants) {
    const key = selectionKey(
      variant.selectedOptions.map(
        (option) => [option.optionKey, option.value] as const,
      ),
    );
    variantsByKey.set(key, variant);
  }
  return {
    product,
    requiredOptionKeys: (product.options ?? []).map((option) => option.key),
    variantsByKey,
  };
}

/**
 * Drops any `(key, value)` pair that either names an axis the product
 * doesn't define, or a value that isn't one of that axis's valid
 * `ProductOptionValue`s — mirrors the legacy resolver's "clean invalid
 * choice ids" step. A dropped pair simply becomes "missing" rather than
 * raising an error: an out-of-date URL/cart line linking to a value a
 * product no longer offers should degrade to "please choose again", not
 * a crash.
 */
function sanitizeSelection(
  index: VariantIndex,
  selection: VariantSelection,
): VariantSelection {
  const cleaned: VariantSelection = {};
  for (const option of index.product.options ?? []) {
    const value = selection[option.key];
    if (value && option.values.some((candidate) => candidate.value === value)) {
      cleaned[option.key] = value;
    }
  }
  return cleaned;
}

export function resolveVariant(
  index: VariantIndex,
  selection: VariantSelection = {},
): ResolvedVariant {
  const cleaned = sanitizeSelection(index, selection);
  const missingOptionKeys = index.requiredOptionKeys.filter(
    (key) => !cleaned[key],
  );
  if (missingOptionKeys.length > 0) {
    return { status: "incomplete", missingOptionKeys };
  }

  const key = selectionKey(
    Object.entries(cleaned) as Array<[ProductOptionKey, string]>,
  );
  const variant = index.variantsByKey.get(key);
  if (!variant) {
    return { status: "unavailableCombination", selection: cleaned };
  }

  return { status: "resolved", variant };
}

/** Convenience one-shot wrapper for call sites that don't already hold a memoized `VariantIndex` (e.g. a single server-side revalidation call, not a UI re-resolving on every click). */
export function resolveVariantForProduct(
  product: Product,
  selection: VariantSelection = {},
): ResolvedVariant {
  return resolveVariant(buildVariantIndex(product), selection);
}

/** Whether a resolved variant can actually be added to cart right now — thin re-export of `isOrderable()` so callers don't need to reach into `inventory-status.ts` themselves just to check a resolution result. */
export function isVariantOrderable(variant: ProductVariant): boolean {
  return isOrderable(variant.inventory);
}

/**
 * The price to actually charge/display for a variant: the variant's own
 * `price` when it has a fixed one, falling back to the parent
 * `Product.basePrice` per both schemas' doc comments ("`price: null`
 * means 'no fixed price', not 'free'"). `null` out means there is
 * genuinely no price anywhere on this product/variant — a quote-only
 * item — and callers must route to the quote-request flow instead of
 * checkout.
 */
export function effectivePrice(
  product: Product,
  variant: ProductVariant,
): Money | null {
  return variant.price ?? product.basePrice ?? null;
}
