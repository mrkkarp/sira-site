import "server-only";
import type { Cart } from "@/domain/ecommerce/cart";
import type { CartLine } from "@/domain/ecommerce/cart-line";
import type { CartId } from "@/domain/shared/ids";

/**
 * Input shape for a cart line that hasn't been persisted yet — no
 * `CartLineId`, since Payload assigns each `lines` array row its own
 * id only once the parent document is saved (mirrors how `NewCart`
 * itself omits `id`/`createdAt`/`updatedAt`).
 */
export type NewCartLine = Omit<CartLine, "id">;

export type NewCart = Omit<Cart, "id" | "createdAt" | "updatedAt" | "lines"> & {
  lines: NewCartLine[];
};

/**
 * `CartRepository` (Prompt 8 §2.3/§6, Phase B). Deliberately a small,
 * whole-document contract rather than fine-grained line-level
 * mutators (`addLine`/`removeLine`/...): the cart service (Phase D) is
 * where quantity merging, `resolveVariant()` price/availability
 * re-validation, and promo-code recalculation actually happen — this
 * layer's only job is "read the persisted cart" and "persist this
 * exact new state", so it stays a pure storage boundary the service
 * sits on top of, not a second place business rules could leak into.
 */
export interface CartRepository {
  findBySessionToken(sessionToken: string): Promise<Cart | null>;
  create(input: NewCart): Promise<Cart>;
  /** Replaces the cart's whole mutable state (lines/currency/promoCodeId/expiresAt) — a full read-modify-write, not a partial patch, so there's exactly one place (the caller) that decides what the next state is. */
  update(id: CartId, input: NewCart): Promise<Cart>;
  deleteBySessionToken(sessionToken: string): Promise<void>;
}

let cachedRepository: CartRepository | null = null;

/** Factory/DI seam, same shape as `getProductRepository()` — Cart has no legacy-JSON equivalent, so there is only ever one implementation, but the indirection keeps call sites decoupled from Payload regardless. */
export async function getCartRepository(): Promise<CartRepository> {
  if (cachedRepository) return cachedRepository;
  const { PayloadCartRepository } = await import("./cart-repository.payload");
  cachedRepository = new PayloadCartRepository();
  return cachedRepository;
}

/** Test-only escape hatch. */
export function __resetCartRepositoryForTests(): void {
  cachedRepository = null;
}
