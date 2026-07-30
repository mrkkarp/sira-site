import "server-only";
import type { Cart as PayloadCart } from "@/payload-types";
import { getPayloadClient } from "@/lib/payload-client";
import {
  CartId,
  CartLineId,
  ProductId,
  VariantId,
  MediaId,
} from "@/domain/shared/ids";
import { money } from "@/domain/shared/money";
import { localeAllToLocaleContent, type LocaleAllValue } from "./locale-all";
import { CartSchema, type Cart } from "@/domain/ecommerce/cart";
import type { CartLine } from "@/domain/ecommerce/cart-line";
import type { CartRepository, NewCart, NewCartLine } from "./cart-repository";

type PayloadCartLine = NonNullable<PayloadCart["lines"]>[number];

function relationId(
  value: number | { id: number } | null | undefined,
): string | null {
  if (value == null) return null;
  return String(typeof value === "number" ? value : value.id);
}

/**
 * `productId` (the Payload relationship) can't losslessly round-trip a
 * `CATALOG_SOURCE=horoshop-snapshot` slug — see `Carts.ts`'s doc
 * comment — so it's only ever a best-effort numeric reference.
 * `productRef` (a plain required text field) is what this repository
 * actually reads back through, always populated verbatim on write.
 */
function toPayloadRelationId(value: string | undefined): number | undefined {
  if (!value) return undefined;
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : undefined;
}

function mapCartLineToDomain(row: PayloadCartLine): CartLine {
  return {
    // Array rows don't have a dedicated `CartLineId` field — Payload's
    // own auto-generated row `id` fills that role, with `sku` as a
    // defensive fallback (mirrors `VariantId.parse(row.id || row.sku)`
    // in `product-repository.payload.ts`).
    id: CartLineId.parse(row.id || row.sku),
    productId: ProductId.parse(row.productRef),
    // The variant's own SKU is used as its `VariantId` throughout this
    // repository layer (see `product-repository.payload.ts`'s
    // `mapVariants`) — there's no separate numeric variant id to relate
    // to, since variants are rows on `Product.variants`, not their own
    // collection.
    variantId: VariantId.parse(row.variantSku),
    sku: row.sku,
    name: localeAllToLocaleContent(
      row.name as unknown as LocaleAllValue,
      row.sku,
    ),
    mediaId: relationId(row.mediaId)
      ? MediaId.parse(relationId(row.mediaId) as string)
      : undefined,
    quantity: row.quantity,
    unitPrice: money(row.unitPrice.currency ?? "UAH", row.unitPrice.minorUnits),
    options: (row.options ?? []).map((option) => ({
      optionKey: option.optionKey,
      value: option.value,
      label: localeAllToLocaleContent(
        option.label as unknown as LocaleAllValue,
        option.value,
      ),
    })),
    addedAt: row.addedAt,
  };
}

/**
 * Payload/Postgres-backed mapper: Payload's generated `Cart` -> domain
 * `Cart`. `promoCodeId` is always `undefined`: `Carts` (Payload) has no
 * field for it, because there's no `PromoCodes` collection to relate to
 * yet (Prompt 8 §14 promo codes are domain-modeled only as of Phase B —
 * see `src/domain/ecommerce/promo-code.ts`). A future promo-codes phase
 * must add the Payload field and this mapping together, not fabricate a
 * value here.
 */
export function mapPayloadCartToDomain(doc: PayloadCart): Cart {
  const mapped: Cart = {
    id: CartId.parse(String(doc.id)),
    sessionToken: doc.sessionToken,
    currency: doc.currency,
    lines: (doc.lines ?? []).map(mapCartLineToDomain),
    promoCodeId: undefined,
    createdAt: doc.createdAt,
    updatedAt: doc.updatedAt,
    expiresAt: doc.expiresAt ?? undefined,
  };
  return CartSchema.parse(mapped);
}

export function buildCartLineData(line: NewCartLine) {
  return {
    productId: toPayloadRelationId(line.productId),
    productRef: line.productId,
    variantSku: line.variantId,
    sku: line.sku,
    name: { uk: line.name.uk, en: line.name.en, pl: line.name.pl },
    mediaId: toPayloadRelationId(line.mediaId),
    quantity: line.quantity,
    unitPrice: {
      currency: line.unitPrice.currency,
      minorUnits: line.unitPrice.minorUnits,
    },
    options: line.options.map((option) => ({
      optionKey: option.optionKey,
      value: option.value,
      label: { uk: option.label.uk, en: option.label.en, pl: option.label.pl },
    })),
    addedAt: line.addedAt,
  };
}

/** See `mapPayloadCartToDomain`'s doc comment: `promoCodeId` is silently dropped here for the same reason — there is nowhere in `Carts` to persist it yet. */
function buildCartData(input: NewCart) {
  return {
    sessionToken: input.sessionToken,
    currency: input.currency,
    lines: input.lines.map(buildCartLineData),
    expiresAt: input.expiresAt,
  };
}

export class PayloadCartRepository implements CartRepository {
  async findBySessionToken(sessionToken: string): Promise<Cart | null> {
    const payload = await getPayloadClient();
    const result = await payload.find({
      collection: "carts",
      where: { sessionToken: { equals: sessionToken } },
      depth: 0,
      limit: 1,
      overrideAccess: true,
    });
    const doc = result.docs[0] as unknown as PayloadCart | undefined;
    return doc ? mapPayloadCartToDomain(doc) : null;
  }

  async create(input: NewCart): Promise<Cart> {
    const payload = await getPayloadClient();
    const created = await payload.create({
      collection: "carts",
      data: buildCartData(input),
      overrideAccess: true,
    });
    return mapPayloadCartToDomain(created as unknown as PayloadCart);
  }

  async update(id: CartId, input: NewCart): Promise<Cart> {
    const payload = await getPayloadClient();
    const updated = await payload.update({
      collection: "carts",
      id: Number(id),
      data: buildCartData(input),
      overrideAccess: true,
    });
    return mapPayloadCartToDomain(updated as unknown as PayloadCart);
  }

  async deleteBySessionToken(sessionToken: string): Promise<void> {
    const payload = await getPayloadClient();
    await payload.delete({
      collection: "carts",
      where: { sessionToken: { equals: sessionToken } },
      overrideAccess: true,
    });
  }
}
