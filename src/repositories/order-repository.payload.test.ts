import { describe, expect, it } from "vitest";
import {
  mapPayloadOrderToDomain,
  buildOrderData,
} from "./order-repository.payload";
import type { Order as PayloadOrder } from "@/payload-types";
import type { NewOrder } from "./order-repository";
import { OrderLineId, ProductId, VariantId } from "@/domain/shared/ids";
import { money } from "@/domain/shared/money";

// `name`/`label` here are the plain `localeContentField()` group (see
// `cart-repository.payload.test.ts`'s comment) — already typed as this
// object shape by Payload's generator.
const baseDoc: PayloadOrder = {
  id: 100,
  orderNumber: "SO-2026-0001",
  lines: [
    {
      id: "line-1",
      productId: 42,
      productRef: "42",
      variantSku: "ODRI-60-GREY",
      sku: "ODRI-60-GREY",
      name: { uk: "Одрі 60" },
      quantity: 1,
      unitPriceMinorUnits: 450000,
      lineTotalMinorUnits: 450000,
      options: [],
    },
  ],
  currency: "UAH",
  totals: {
    subtotalMinorUnits: 450000,
    discountTotalMinorUnits: 0,
    deliveryTotalMinorUnits: 10000,
    totalMinorUnits: 460000,
  },
  deliveryMethod: {
    type: "novaPoshtaBranch",
    cityName: "Київ",
    branchNumber: "12",
  },
  customer: { fullName: "Іван Іванов", phone: "+380501234567" },
  status: "pending",
  updatedAt: "2026-01-01T00:00:00.000Z",
  createdAt: "2026-01-01T00:00:00.000Z",
};

describe("mapPayloadOrderToDomain", () => {
  it("maps totals, customer and a novaPoshtaBranch delivery method", () => {
    const order = mapPayloadOrderToDomain(baseDoc);
    expect(order.id).toBe("100");
    expect(order.orderNumber).toBe("SO-2026-0001");
    expect(order.subtotal).toEqual({ currency: "UAH", minorUnits: 450000 });
    expect(order.total).toEqual({ currency: "UAH", minorUnits: 460000 });
    expect(order.deliveryMethod).toEqual({
      type: "novaPoshtaBranch",
      cityName: "Київ",
      branchNumber: "12",
      branchAddress: undefined,
    });
    expect(order.customer).toEqual({
      fullName: "Іван Іванов",
      phone: "+380501234567",
      email: undefined,
      companyName: undefined,
      notes: undefined,
    });
    expect(order.promoCodeId).toBeUndefined();
    expect(order.paymentId).toBeUndefined();
  });

  it("maps a courier delivery method", () => {
    const order = mapPayloadOrderToDomain({
      ...baseDoc,
      deliveryMethod: {
        type: "courier",
        cityName: "Львів",
        address: "вул. Франка, 1",
      },
    });
    expect(order.deliveryMethod).toEqual({
      type: "courier",
      cityName: "Львів",
      address: "вул. Франка, 1",
    });
  });

  it("bridges pickup's missing StockistId via the free-text stockistNote", () => {
    const order = mapPayloadOrderToDomain({
      ...baseDoc,
      deliveryMethod: {
        type: "pickup",
        stockistNote: "Шоурум Київ, вул. Хрещатик 1",
      },
    });
    expect(order.deliveryMethod).toEqual({
      type: "pickup",
      stockistId: "Шоурум Київ, вул. Хрещатик 1",
    });
  });

  it("resolves a populated paymentId relationship down to its bare id", () => {
    const order = mapPayloadOrderToDomain({ ...baseDoc, paymentId: 7 });
    expect(order.paymentId).toBe("7");
  });

  it("reads a line's productId back from productRef even when the productId relationship is unset (horoshop-snapshot bridge mode)", () => {
    const order = mapPayloadOrderToDomain({
      ...baseDoc,
      lines: [
        {
          ...baseDoc.lines![0],
          productId: null as unknown as number,
          productRef: "odri",
        },
      ],
    });
    expect(order.lines[0].productId).toBe("odri");
  });
});

describe("buildOrderData", () => {
  const baseOrder: NewOrder = {
    orderNumber: "SO-2026-0001",
    lines: [
      {
        id: OrderLineId.parse("line-1"),
        productId: ProductId.parse("odri"),
        variantId: VariantId.parse("ODRI-60-GREY"),
        sku: "ODRI-60-GREY",
        name: { uk: "Одрі 60" },
        quantity: 1,
        unitPrice: money("UAH", 450000),
        lineTotal: money("UAH", 450000),
        options: [],
      },
    ],
    subtotal: money("UAH", 450000),
    discountTotal: money("UAH", 0),
    deliveryTotal: money("UAH", 0),
    total: money("UAH", 450000),
    deliveryMethod: {
      type: "courier",
      cityName: "Львів",
      address: "вул. Франка, 1",
    },
    customer: { fullName: "Іван Іванов", phone: "+380501234567" },
    status: "pending",
  };

  it("drops a non-numeric line productId (a slug) from the relationship but keeps it losslessly in productRef", () => {
    const data = buildOrderData(baseOrder);
    expect(data.lines[0].productId).toBeUndefined();
    expect(data.lines[0].productRef).toBe("odri");
  });

  it("keeps a genuinely numeric line productId as both the relationship and productRef", () => {
    const data = buildOrderData({
      ...baseOrder,
      lines: [{ ...baseOrder.lines[0], productId: ProductId.parse("42") }],
    });
    expect(data.lines[0].productId).toBe(42);
    expect(data.lines[0].productRef).toBe("42");
  });
});
