import "server-only";
import {
  getCartRepository,
  type CartRepository,
  type NewCart,
  type NewCartLine,
} from "@/repositories/cart-repository";
import {
  getProductById,
  getProductBySlug,
  effectivePrice,
  isVariantOrderable,
} from "./product-service";
import type { ProductRepository } from "@/repositories/product-repository";
import type { Cart } from "@/domain/ecommerce/cart";
import type { CartLine } from "@/domain/ecommerce/cart-line";
import type { Product } from "@/domain/catalog/product";
import type { ProductVariant } from "@/domain/catalog/product-variant";
import {
  resolveLocaleContent,
  type LocaleContent,
} from "@/domain/shared/locale-content";
import { moneyToDecimal } from "@/domain/shared/money";

/**
 * `CartService` (Prompt 8 §2.3/§6/§7, Phase D) — the one place a
 * customer's "add this variant to my cart" turns into a persisted
 * `Cart` row, or an explanation of why it can't. Mirrors the shape of
 * `product-service.ts` (Phase C): a thin, pure-business-logic facade
 * over `CartRepository`, with every export taking an optional
 * `Dependencies` bag so tests can inject in-memory fakes for both
 * repositories it needs, without touching `CATALOG_SOURCE`/the
 * module-level repository caches.
 *
 * The cart never trusts a price/label the client already has: every
 * mutation re-resolves the product+variant from `ProductRepository`
 * and re-derives price/orderability via `effectivePrice()`/
 * `isVariantOrderable()` (§7/§13's "завжди перевіряй ціну і наявність
 * на сервері"). `CartLine.unitPrice` is still stored as a snapshot
 * (per its own doc comment), but `getCartView()` below additionally
 * reports the *live* price/orderability for each line so a `/cart`
 * page can flag a stale price before checkout — it never silently
 * overwrites the stored snapshot on a plain read.
 */
export interface Dependencies {
  cartRepository?: CartRepository;
  productRepository?: ProductRepository;
}

async function resolveCartRepository(
  deps?: Dependencies,
): Promise<CartRepository> {
  return deps?.cartRepository ?? (await getCartRepository());
}

export interface AddCartLineInput {
  slug: string;
  variantSku: string;
  quantity?: number;
}

export type CartLineMutationResult =
  | { status: "ok"; cart: Cart }
  | { status: "productNotFound" }
  | { status: "variantNotFound" }
  | { status: "notOrderable" }
  | { status: "noPrice" };

export type CartLineUpdateResult =
  { status: "ok"; cart: Cart } | { status: "lineNotFound" };

const DEFAULT_CURRENCY = "UAH" as const;

function findVariantBySku(
  product: Product,
  sku: string,
): ProductVariant | undefined {
  return product.variants.find((variant) => variant.sku === sku);
}

/** Best-effort label for a variant's selected option value — falls back to the raw value itself (already human-readable Ukrainian text for legacy-bridged products, see `product-repository.horoshop-snapshot.ts`) when the product doesn't define a matching `ProductOption` axis to look the real label up in. */
function optionValueLabel(
  product: Product,
  optionKey: string,
  value: string,
): LocaleContent {
  const option = product.options?.find(
    (candidate) => candidate.key === optionKey,
  );
  const found = option?.values.find((candidate) => candidate.value === value);
  return found?.label ?? { uk: value };
}

function toNewLine(
  product: Product,
  variant: ProductVariant,
  quantity: number,
): NewCartLine {
  return {
    productId: product.id,
    variantId: variant.id,
    sku: variant.sku,
    name: product.name,
    mediaId: variant.mediaIds?.[0] ?? product.mainMediaId ?? undefined,
    quantity,
    unitPrice: effectivePrice(product, variant)!,
    options: variant.selectedOptions.map((option) => ({
      ...option,
      label: optionValueLabel(product, option.optionKey, option.value),
    })),
    addedAt: new Date().toISOString(),
  };
}

/** Drops the persisted `id` — every `CartRepository.update()` call rebuilds the full `NewCartLine[]` from scratch (see its doc comment: a whole-document replace, not a patch), so a line's `id` from before the call is never reusable input to it. */
function stripId(line: CartLine): NewCartLine {
  return {
    productId: line.productId,
    variantId: line.variantId,
    sku: line.sku,
    name: line.name,
    mediaId: line.mediaId,
    quantity: line.quantity,
    unitPrice: line.unitPrice,
    options: line.options,
    addedAt: line.addedAt,
  };
}

/** Merges `newLine` into `existingLines` by `variantId` — same quantity as an existing line already in the cart, or a brand new line. */
function mergeLine(
  existingLines: readonly CartLine[],
  newLine: NewCartLine,
): NewCartLine[] {
  let merged = false;
  const next = existingLines.map((line): NewCartLine => {
    if (line.variantId !== newLine.variantId) return stripId(line);
    merged = true;
    return {
      ...stripId(line),
      quantity: line.quantity + newLine.quantity,
      unitPrice: newLine.unitPrice,
      options: newLine.options,
      name: newLine.name,
    };
  });
  if (!merged) next.push(newLine);
  return next;
}

function toNewCart(cart: Cart, lines: NewCartLine[]): NewCart {
  return {
    sessionToken: cart.sessionToken,
    currency: cart.currency,
    lines,
    promoCodeId: cart.promoCodeId,
    expiresAt: cart.expiresAt,
  };
}

export async function getCart(
  sessionToken: string,
  deps?: Dependencies,
): Promise<Cart | null> {
  const cartRepo = await resolveCartRepository(deps);
  return cartRepo.findBySessionToken(sessionToken);
}

export async function addLineToCart(
  sessionToken: string,
  input: AddCartLineInput,
  deps?: Dependencies,
): Promise<CartLineMutationResult> {
  const product = await getProductBySlug(input.slug, deps?.productRepository);
  if (!product) return { status: "productNotFound" };

  const variant = findVariantBySku(product, input.variantSku);
  if (!variant) return { status: "variantNotFound" };

  if (!isVariantOrderable(variant)) return { status: "notOrderable" };
  if (effectivePrice(product, variant) === null) return { status: "noPrice" };

  const quantity = input.quantity ?? 1;
  const newLine = toNewLine(product, variant, quantity);

  const cartRepo = await resolveCartRepository(deps);
  const existingCart = await cartRepo.findBySessionToken(sessionToken);

  const cart = existingCart
    ? await cartRepo.update(
        existingCart.id,
        toNewCart(existingCart, mergeLine(existingCart.lines, newLine)),
      )
    : await cartRepo.create({
        sessionToken,
        currency: DEFAULT_CURRENCY,
        lines: [newLine],
        promoCodeId: undefined,
        expiresAt: undefined,
      });

  return { status: "ok", cart };
}

export async function updateLineQuantity(
  sessionToken: string,
  lineId: string,
  quantity: number,
  deps?: Dependencies,
): Promise<CartLineUpdateResult> {
  const cartRepo = await resolveCartRepository(deps);
  const existingCart = await cartRepo.findBySessionToken(sessionToken);
  if (!existingCart) return { status: "lineNotFound" };
  if (!existingCart.lines.some((line) => line.id === lineId))
    return { status: "lineNotFound" };

  const lines: NewCartLine[] = existingCart.lines
    .filter((line) => quantity > 0 || line.id !== lineId)
    .map((line) =>
      line.id === lineId ? { ...stripId(line), quantity } : stripId(line),
    );

  const cart = await cartRepo.update(
    existingCart.id,
    toNewCart(existingCart, lines),
  );
  return { status: "ok", cart };
}

export async function removeLine(
  sessionToken: string,
  lineId: string,
  deps?: Dependencies,
): Promise<CartLineUpdateResult> {
  return updateLineQuantity(sessionToken, lineId, 0, deps);
}

export async function clearCart(
  sessionToken: string,
  deps?: Dependencies,
): Promise<void> {
  const cartRepo = await resolveCartRepository(deps);
  await cartRepo.deleteBySessionToken(sessionToken);
}

export interface CartLineView {
  id: string;
  productSlug: string;
  productName: string;
  variantSku: string;
  variantLabel?: string;
  mediaId?: string;
  quantity: number;
  unitPrice: number;
  currentPrice: number | null;
  priceChanged: boolean;
  orderable: boolean;
  currency: string;
}

export interface CartView {
  lines: CartLineView[];
  currency: string;
  count: number;
  subtotal: number;
}

/**
 * Hydrates the persisted `Cart` with live product/variant data for
 * display — this is the one place a `/cart` page or checkout step
 * should read from, never `getCart()` directly, so it never shows a
 * stale price/availability without at least flagging it. A line whose
 * product/variant has disappeared from the catalog entirely is
 * reported as `orderable: false`, `currentPrice: null` rather than
 * thrown away silently — the customer should see it and remove it
 * themselves, not have it vanish.
 */
export async function getCartView(
  sessionToken: string,
  locale: "uk" | "en" | "pl" = "uk",
  deps?: Dependencies,
): Promise<CartView> {
  const cart = await getCart(sessionToken, deps);
  if (!cart)
    return { lines: [], currency: DEFAULT_CURRENCY, count: 0, subtotal: 0 };

  const lines: CartLineView[] = [];
  for (const line of cart.lines) {
    const product = await getProductById(
      line.productId,
      deps?.productRepository,
    );
    const variant = product?.variants.find(
      (candidate) => candidate.id === line.variantId,
    );
    const currentMoney =
      product && variant ? effectivePrice(product, variant) : null;
    const currentPrice = currentMoney ? moneyToDecimal(currentMoney) : null;
    const unitPrice = moneyToDecimal(line.unitPrice);

    lines.push({
      id: line.id,
      productSlug: product?.slug ?? line.productId,
      productName: product
        ? resolveLocaleContent(product.name, locale)
        : resolveLocaleContent(line.name, locale),
      variantSku: line.sku,
      variantLabel: line.options[0]
        ? resolveLocaleContent(line.options[0].label, locale)
        : undefined,
      mediaId: line.mediaId,
      quantity: line.quantity,
      unitPrice,
      currentPrice,
      priceChanged: currentPrice !== null && currentPrice !== unitPrice,
      orderable: Boolean(product && variant && isVariantOrderable(variant)),
      currency: line.unitPrice.currency,
    });
  }

  const count = lines.reduce((sum, line) => sum + line.quantity, 0);
  const subtotal = lines.reduce(
    (sum, line) => sum + (line.currentPrice ?? line.unitPrice) * line.quantity,
    0,
  );

  return { lines, currency: cart.currency, count, subtotal };
}
