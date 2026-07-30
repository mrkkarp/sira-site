import { describe, expect, it } from "vitest";
import {
  mapPayloadCartToDomain,
  buildCartLineData,
} from "./cart-repository.payload";
import type { Cart as PayloadCart } from "@/payload-types";
import type { NewCartLine } from "./cart-repository";
import { ProductId, VariantId } from "@/domain/shared/ids";
import { money } from "@/domain/shared/money";

// Unlike `Product.name` (a real Payload `localized: true` field, only
// readable as `{uk,en?,pl?}` via the special `locale: "all"` query), a
// cart line's `name`/`label` are the plain `localeContentField()` group
// (see `src/collections/fields/localeContentField.ts`) — Payload's
// generator already types them as this object shape directly, no
// `locale: "all"` bridging needed.
const doc: PayloadCart = {
  id: 5,
  sessionToken: "tok-abc",
  currency: "UAH",
  lines: [
    {
      id: "line-1",
      productId: 42,
      productRef: "42",
      variantSku: "ODRI-60-GREY",
      sku: "ODRI-60-GREY",
      name: { uk: "Одрі 60", en: "Odri 60" },
      mediaId: 9,
      quantity: 2,
      unitPrice: { currency: "UAH", minorUnits: 450000 },
      options: [
        {
          id: "opt-1",
          optionKey: "colour",
          value: "3",
          label: { uk: "Сірий базовий" },
        },
      ],
      addedAt: "2026-01-01T00:00:00.000Z",
    },
  ],
  expiresAt: "2026-02-01T00:00:00.000Z",
  updatedAt: "2026-01-01T00:00:00.000Z",
  createdAt: "2026-01-01T00:00:00.000Z",
};

describe("mapPayloadCartToDomain", () => {
  it("maps top-level cart fields from bare numeric ids", () => {
    const cart = mapPayloadCartToDomain(doc);
    expect(cart.id).toBe("5");
    expect(cart.sessionToken).toBe("tok-abc");
    expect(cart.currency).toBe("UAH");
    expect(cart.expiresAt).toBe("2026-02-01T00:00:00.000Z");
    // No `PromoCodes` collection to relate to yet (Phase B scope) — always undefined.
    expect(cart.promoCodeId).toBeUndefined();
  });

  it("maps a line's productId/variantId/mediaId/price/options", () => {
    const cart = mapPayloadCartToDomain(doc);
    expect(cart.lines).toHaveLength(1);
    const [line] = cart.lines;
    expect(line.id).toBe("line-1");
    expect(line.productId).toBe("42");
    expect(line.variantId).toBe("ODRI-60-GREY");
    expect(line.mediaId).toBe("9");
    expect(line.name).toEqual({ uk: "Одрі 60", en: "Odri 60" });
    expect(line.unitPrice).toEqual({ currency: "UAH", minorUnits: 450000 });
    expect(line.options).toEqual([
      { optionKey: "colour", value: "3", label: { uk: "Сірий базовий" } },
    ]);
  });

  it("reads productId back from productRef even when the productId relationship is unset (horoshop-snapshot bridge mode)", () => {
    const cart = mapPayloadCartToDomain({
      ...doc,
      lines: [
        {
          ...doc.lines![0],
          productId: null as unknown as number,
          productRef: "odri",
        },
      ],
    });
    expect(cart.lines[0].productId).toBe("odri");
  });

  it("maps an empty cart (no lines, no expiry)", () => {
    const empty = mapPayloadCartToDomain({
      ...doc,
      lines: [],
      expiresAt: null,
    });
    expect(empty.lines).toEqual([]);
    expect(empty.expiresAt).toBeUndefined();
  });
});

describe("buildCartLineData", () => {
  const baseLine: NewCartLine = {
    productId: ProductId.parse("odri"),
    variantId: VariantId.parse("ODRI-60-GREY"),
    sku: "ODRI-60-GREY",
    name: { uk: "Одрі 60" },
    quantity: 1,
    unitPrice: money("UAH", 450000),
    options: [],
    addedAt: "2026-01-01T00:00:00.000Z",
  };

  it("drops a non-numeric productId (a slug) from the relationship but keeps it losslessly in productRef", () => {
    const data = buildCartLineData(baseLine);
    expect(data.productId).toBeUndefined();
    expect(data.productRef).toBe("odri");
  });

  it("keeps a genuinely numeric productId as both the relationship and productRef", () => {
    const data = buildCartLineData({
      ...baseLine,
      productId: ProductId.parse("42"),
    });
    expect(data.productId).toBe(42);
    expect(data.productRef).toBe("42");
  });
});
