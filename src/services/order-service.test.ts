import { describe, expect, it, beforeEach, afterEach } from "vitest";
import {
  ProductId,
  VariantId,
  CategoryId,
  CartId,
  CartLineId,
  OrderId,
  PaymentId,
} from "@/domain/shared/ids";
import type { Product } from "@/domain/catalog/product";
import type { ProductRepository } from "@/repositories/product-repository";
import type { CartRepository } from "@/repositories/cart-repository";
import type { Cart } from "@/domain/ecommerce/cart";
import type { CartLine } from "@/domain/ecommerce/cart-line";
import type {
  OrderRepository,
  NewOrder,
} from "@/repositories/order-repository";
import type { Order } from "@/domain/ecommerce/order";
import type {
  PaymentRepository,
  NewPayment,
} from "@/repositories/payment-repository";
import type { Payment } from "@/domain/ecommerce/payment";
import { placeOrder } from "./order-service";

/**
 * Same hand-rolled in-memory fakes / DI approach as `cart-service.test.ts`,
 * extended to the two extra repositories `placeOrder` touches
 * (`OrderRepository`/`PaymentRepository`). No Payload, no Postgres, and
 * critically no real `LIQPAY_PUBLIC_KEY`/`LIQPAY_PRIVATE_KEY` env vars, so
 * `isLiqPayConfigured()` is exercised in both branches by toggling
 * `process.env` directly per-test.
 */
function fakeCartRepository(cart: Cart | null): CartRepository {
  let store = cart;
  return {
    async findBySessionToken(sessionToken: string) {
      return store && store.sessionToken === sessionToken ? store : null;
    },
    async create() {
      throw new Error("not used by placeOrder");
    },
    async update() {
      throw new Error("not used by placeOrder");
    },
    async deleteBySessionToken(sessionToken: string) {
      if (store && store.sessionToken === sessionToken) store = null;
    },
  };
}

function fakeProductRepository(products: Product[]): ProductRepository {
  return {
    async findAll() {
      return products;
    },
    async findBySlug(slug: string) {
      return products.find((p) => p.slug === slug) ?? null;
    },
    async findById(id) {
      return products.find((p) => p.id === id) ?? null;
    },
    async findByCategorySlug() {
      return products;
    },
  };
}

function fakeOrderRepository(): OrderRepository & { created: NewOrder[] } {
  let nextId = 1;
  const orders = new Map<string, Order>();
  const repo = {
    created: [] as NewOrder[],
    async findById(id: OrderId) {
      return [...orders.values()].find((o) => o.id === id) ?? null;
    },
    async findByOrderNumber(orderNumber: string) {
      return orders.get(orderNumber) ?? null;
    },
    async create(input: NewOrder) {
      repo.created.push(input);
      const order: Order = {
        ...input,
        id: OrderId.parse(`order-${nextId++}`),
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };
      orders.set(order.orderNumber, order);
      return order;
    },
    async updateStatus(id: OrderId, status: Order["status"]) {
      const order = [...orders.values()].find((o) => o.id === id);
      if (!order) throw new Error("order not found");
      const updated = { ...order, status, updatedAt: new Date().toISOString() };
      orders.set(updated.orderNumber, updated);
      return updated;
    },
    async attachPayment(id: OrderId, paymentId: Order["paymentId"]) {
      const order = [...orders.values()].find((o) => o.id === id);
      if (!order) throw new Error("order not found");
      const updated = {
        ...order,
        paymentId,
        updatedAt: new Date().toISOString(),
      };
      orders.set(updated.orderNumber, updated);
      return updated;
    },
  };
  return repo;
}

function fakePaymentRepository(): PaymentRepository & {
  created: NewPayment[];
} {
  let nextId = 1;
  const payments: Payment[] = [];
  return {
    created: [] as NewPayment[],
    async findById(id) {
      return payments.find((p) => p.id === id) ?? null;
    },
    async findByExternalId(externalId: string) {
      return payments.find((p) => p.externalId === externalId) ?? null;
    },
    async findByOrderId(orderId) {
      return payments.filter((p) => p.orderId === orderId);
    },
    async create(input: NewPayment) {
      (this as unknown as { created: NewPayment[] }).created.push(input);
      const payment: Payment = {
        ...input,
        id: PaymentId.parse(`payment-${nextId++}`),
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };
      payments.push(payment);
      return payment;
    },
    async updateStatus(id, status, patch) {
      const index = payments.findIndex((p) => p.id === id);
      if (index === -1) throw new Error("payment not found");
      const updated = {
        ...payments[index],
        status,
        ...patch,
        updatedAt: new Date().toISOString(),
      };
      payments[index] = updated;
      return updated;
    },
  };
}

const product = (overrides: Partial<Product> = {}): Product => ({
  id: ProductId.parse("prod-1"),
  slug: "prod-1",
  sku: "PROD-1",
  name: { uk: "Тестовий товар" },
  categoryId: CategoryId.parse("cat-1"),
  basePrice: { currency: "UAH", minorUnits: 100000 },
  editorialStatus: "published",
  stockStatus: "madeToOrder",
  variants: [
    {
      id: VariantId.parse("PROD-1"),
      productId: ProductId.parse("prod-1"),
      sku: "PROD-1",
      selectedOptions: [],
      price: null,
      inventory: { status: "inStock" },
    },
  ],
  ...overrides,
});

const cartLine = (overrides: Partial<CartLine> = {}): CartLine => ({
  id: CartLineId.parse("line-1"),
  productId: ProductId.parse("prod-1"),
  variantId: VariantId.parse("PROD-1"),
  sku: "PROD-1",
  name: { uk: "Тестовий товар" },
  mediaId: undefined,
  quantity: 2,
  unitPrice: { currency: "UAH", minorUnits: 100000 },
  options: [],
  addedAt: new Date().toISOString(),
  ...overrides,
});

const cart = (lines: CartLine[]): Cart => ({
  id: CartId.parse("cart-1"),
  sessionToken: "token-1",
  currency: "UAH",
  lines,
  createdAt: new Date().toISOString(),
  updatedAt: new Date().toISOString(),
});

const customer = { fullName: "Іван Іванов", phone: "+380501234567" };
const deliveryMethod = {
  type: "pickup" as const,
  stockistId: "stockist-1" as never,
};

const ORIGINAL_ENV = { ...process.env };

beforeEach(() => {
  delete process.env.LIQPAY_PUBLIC_KEY;
  delete process.env.LIQPAY_PRIVATE_KEY;
});

afterEach(() => {
  process.env = { ...ORIGINAL_ENV };
});

describe("placeOrder", () => {
  it("returns cartEmpty when there is no cart for the session", async () => {
    const deps = {
      cartRepository: fakeCartRepository(null),
      productRepository: fakeProductRepository([]),
      orderRepository: fakeOrderRepository(),
      paymentRepository: fakePaymentRepository(),
    };
    const result = await placeOrder(
      "token-1",
      { customer, deliveryMethod },
      deps,
    );
    expect(result).toEqual({ status: "cartEmpty" });
  });

  it("returns cartEmpty when the cart has no lines", async () => {
    const deps = {
      cartRepository: fakeCartRepository(cart([])),
      productRepository: fakeProductRepository([]),
      orderRepository: fakeOrderRepository(),
      paymentRepository: fakePaymentRepository(),
    };
    const result = await placeOrder(
      "token-1",
      { customer, deliveryMethod },
      deps,
    );
    expect(result).toEqual({ status: "cartEmpty" });
  });

  it("returns lineUnavailable when a line's product has since disappeared", async () => {
    const deps = {
      cartRepository: fakeCartRepository(cart([cartLine()])),
      productRepository: fakeProductRepository([]),
      orderRepository: fakeOrderRepository(),
      paymentRepository: fakePaymentRepository(),
    };
    const result = await placeOrder(
      "token-1",
      { customer, deliveryMethod },
      deps,
    );
    expect(result).toEqual({ status: "lineUnavailable", sku: "PROD-1" });
  });

  it("returns lineUnavailable when the variant is no longer orderable, never trusting the cart's stored snapshot", async () => {
    const unavailableProduct = product({
      variants: [
        {
          id: VariantId.parse("PROD-1"),
          productId: ProductId.parse("prod-1"),
          sku: "PROD-1",
          selectedOptions: [],
          price: null,
          inventory: { status: "unavailable", reason: "Немає на складі" },
        },
      ],
    });
    const deps = {
      cartRepository: fakeCartRepository(cart([cartLine()])),
      productRepository: fakeProductRepository([unavailableProduct]),
      orderRepository: fakeOrderRepository(),
      paymentRepository: fakePaymentRepository(),
    };
    const result = await placeOrder(
      "token-1",
      { customer, deliveryMethod },
      deps,
    );
    expect(result).toEqual({ status: "lineUnavailable", sku: "PROD-1" });
  });

  it("re-prices from the live product/variant rather than the cart's stale unitPrice snapshot", async () => {
    const repriced = product({
      basePrice: { currency: "UAH", minorUnits: 150000 },
    });
    const deps = {
      // Cart line remembers the old 1000 UAH price; the live product is now 1500 UAH.
      cartRepository: fakeCartRepository(
        cart([
          cartLine({ unitPrice: { currency: "UAH", minorUnits: 100000 } }),
        ]),
      ),
      productRepository: fakeProductRepository([repriced]),
      orderRepository: fakeOrderRepository(),
      paymentRepository: fakePaymentRepository(),
    };
    const result = await placeOrder(
      "token-1",
      { customer, deliveryMethod },
      deps,
    );
    if (result.status !== "ok") throw new Error("unreachable");
    expect(result.order.lines[0].unitPrice).toEqual({
      currency: "UAH",
      minorUnits: 150000,
    });
    expect(result.order.subtotal).toEqual({
      currency: "UAH",
      minorUnits: 300000,
    });
    expect(result.order.total).toEqual(result.order.subtotal);
  });

  it("creates a manual/pending order + payment when LiqPay isn't configured, and clears the cart", async () => {
    const cartRepo = fakeCartRepository(cart([cartLine()]));
    const deps = {
      cartRepository: cartRepo,
      productRepository: fakeProductRepository([product()]),
      orderRepository: fakeOrderRepository(),
      paymentRepository: fakePaymentRepository(),
    };
    const result = await placeOrder(
      "token-1",
      { customer, deliveryMethod },
      deps,
    );
    if (result.status !== "ok") throw new Error("unreachable");
    expect(result.order.status).toBe("pending");
    expect(result.payment.provider).toBe("manual");
    expect(result.payment.status).toBe("pending");
    expect(result.order.paymentId).toBe(result.payment.id);
    expect(result.order.orderNumber).toMatch(/^SO-\d{8}-[A-Z0-9]{6}$/);
    expect(await cartRepo.findBySessionToken("token-1")).toBeNull();
  });

  it("creates an awaitingPayment order + liqpay payment when LiqPay is configured", async () => {
    process.env.LIQPAY_PUBLIC_KEY = "pk_test";
    process.env.LIQPAY_PRIVATE_KEY = "sk_test";
    const deps = {
      cartRepository: fakeCartRepository(cart([cartLine()])),
      productRepository: fakeProductRepository([product()]),
      orderRepository: fakeOrderRepository(),
      paymentRepository: fakePaymentRepository(),
    };
    const result = await placeOrder(
      "token-1",
      { customer, deliveryMethod },
      deps,
    );
    if (result.status !== "ok") throw new Error("unreachable");
    expect(result.order.status).toBe("awaitingPayment");
    expect(result.payment.provider).toBe("liqpay");
  });

  it("never fabricates a discount or delivery cost — both are always 0", async () => {
    const deps = {
      cartRepository: fakeCartRepository(cart([cartLine()])),
      productRepository: fakeProductRepository([product()]),
      orderRepository: fakeOrderRepository(),
      paymentRepository: fakePaymentRepository(),
    };
    const result = await placeOrder(
      "token-1",
      { customer, deliveryMethod },
      deps,
    );
    if (result.status !== "ok") throw new Error("unreachable");
    expect(result.order.discountTotal).toEqual({
      currency: "UAH",
      minorUnits: 0,
    });
    expect(result.order.deliveryTotal).toEqual({
      currency: "UAH",
      minorUnits: 0,
    });
  });
});
