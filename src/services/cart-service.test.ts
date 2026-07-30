import { describe, expect, it } from "vitest";
import {
  ProductId,
  VariantId,
  CategoryId,
  CartId,
  CartLineId,
} from "@/domain/shared/ids";
import type { Product } from "@/domain/catalog/product";
import type { ProductRepository } from "@/repositories/product-repository";
import type { CartRepository, NewCart } from "@/repositories/cart-repository";
import type { Cart } from "@/domain/ecommerce/cart";
import {
  addLineToCart,
  updateLineQuantity,
  removeLine,
  clearCart,
  getCart,
  getCartView,
} from "./cart-service";

/**
 * Same DI approach as `product-service.test.ts`: hand-rolled in-memory
 * fakes for both `ProductRepository` and `CartRepository`, injected via
 * the `Dependencies` bag every export takes — no Payload, no Postgres.
 * The fake `CartRepository` mimics the one behaviour that matters for
 * these tests: `create`/`update` assign fresh ids (a real Payload save
 * would too, since `NewCartLine`/`NewCart` never carry one in).
 */
function fakeCartRepository(): CartRepository {
  let store: Cart | null = null;
  let nextId = 1;

  function save(input: NewCart): Cart {
    store = {
      id: store?.id ?? CartId.parse(`cart-${nextId++}`),
      sessionToken: input.sessionToken,
      currency: input.currency,
      lines: input.lines.map((line) => ({
        ...line,
        id: CartLineId.parse(`line-${nextId++}`),
      })),
      promoCodeId: input.promoCodeId,
      createdAt: store?.createdAt ?? new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      expiresAt: input.expiresAt,
    };
    return store;
  }

  return {
    async findBySessionToken(sessionToken: string) {
      return store && store.sessionToken === sessionToken ? store : null;
    },
    async create(input: NewCart) {
      return save(input);
    },
    async update(_id, input: NewCart) {
      return save(input);
    },
    async deleteBySessionToken() {
      store = null;
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

describe("addLineToCart", () => {
  it("creates a new cart with one line when none exists yet", async () => {
    const deps = {
      cartRepository: fakeCartRepository(),
      productRepository: fakeProductRepository([product()]),
    };
    const result = await addLineToCart(
      "token-1",
      { slug: "prod-1", variantSku: "PROD-1" },
      deps,
    );
    expect(result.status).toBe("ok");
    if (result.status !== "ok") throw new Error("unreachable");
    expect(result.cart.lines).toHaveLength(1);
    expect(result.cart.lines[0]).toMatchObject({
      sku: "PROD-1",
      quantity: 1,
      unitPrice: { minorUnits: 100000 },
    });
  });

  it("merges quantity into the existing line for the same variant instead of duplicating it", async () => {
    const deps = {
      cartRepository: fakeCartRepository(),
      productRepository: fakeProductRepository([product()]),
    };
    await addLineToCart(
      "token-1",
      { slug: "prod-1", variantSku: "PROD-1", quantity: 2 },
      deps,
    );
    const second = await addLineToCart(
      "token-1",
      { slug: "prod-1", variantSku: "PROD-1", quantity: 3 },
      deps,
    );
    if (second.status !== "ok") throw new Error("unreachable");
    expect(second.cart.lines).toHaveLength(1);
    expect(second.cart.lines[0].quantity).toBe(5);
  });

  it("adds a second distinct line for a different variant", async () => {
    const twoVariantProduct = product({
      variants: [
        ...product().variants,
        {
          id: VariantId.parse("PROD-1-B"),
          productId: ProductId.parse("prod-1"),
          sku: "PROD-1-B",
          selectedOptions: [],
          price: { currency: "UAH", minorUnits: 200000 },
          inventory: { status: "inStock" },
        },
      ],
    });
    const deps = {
      cartRepository: fakeCartRepository(),
      productRepository: fakeProductRepository([twoVariantProduct]),
    };
    await addLineToCart(
      "token-1",
      { slug: "prod-1", variantSku: "PROD-1" },
      deps,
    );
    const result = await addLineToCart(
      "token-1",
      { slug: "prod-1", variantSku: "PROD-1-B" },
      deps,
    );
    if (result.status !== "ok") throw new Error("unreachable");
    expect(result.cart.lines).toHaveLength(2);
  });

  it("returns productNotFound for an unknown slug", async () => {
    const deps = {
      cartRepository: fakeCartRepository(),
      productRepository: fakeProductRepository([]),
    };
    const result = await addLineToCart(
      "token-1",
      { slug: "missing", variantSku: "x" },
      deps,
    );
    expect(result).toEqual({ status: "productNotFound" });
  });

  it("returns variantNotFound for a sku the product doesn't have", async () => {
    const deps = {
      cartRepository: fakeCartRepository(),
      productRepository: fakeProductRepository([product()]),
    };
    const result = await addLineToCart(
      "token-1",
      { slug: "prod-1", variantSku: "does-not-exist" },
      deps,
    );
    expect(result).toEqual({ status: "variantNotFound" });
  });

  it("returns notOrderable for an unavailable variant, without persisting a line", async () => {
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
      cartRepository: fakeCartRepository(),
      productRepository: fakeProductRepository([unavailableProduct]),
    };
    const result = await addLineToCart(
      "token-1",
      { slug: "prod-1", variantSku: "PROD-1" },
      deps,
    );
    expect(result).toEqual({ status: "notOrderable" });
    expect(await getCart("token-1", deps)).toBeNull();
  });

  it("returns noPrice for a quote-only product/variant", async () => {
    const quoteOnlyProduct = product({ basePrice: null });
    const deps = {
      cartRepository: fakeCartRepository(),
      productRepository: fakeProductRepository([quoteOnlyProduct]),
    };
    const result = await addLineToCart(
      "token-1",
      { slug: "prod-1", variantSku: "PROD-1" },
      deps,
    );
    expect(result).toEqual({ status: "noPrice" });
  });
});

describe("updateLineQuantity / removeLine", () => {
  it("updates the quantity of an existing line", async () => {
    const deps = {
      cartRepository: fakeCartRepository(),
      productRepository: fakeProductRepository([product()]),
    };
    const added = await addLineToCart(
      "token-1",
      { slug: "prod-1", variantSku: "PROD-1" },
      deps,
    );
    if (added.status !== "ok") throw new Error("unreachable");
    const result = await updateLineQuantity(
      "token-1",
      added.cart.lines[0].id,
      7,
      deps,
    );
    if (result.status !== "ok") throw new Error("unreachable");
    expect(result.cart.lines[0].quantity).toBe(7);
  });

  it("removes the line entirely when quantity drops to 0", async () => {
    const deps = {
      cartRepository: fakeCartRepository(),
      productRepository: fakeProductRepository([product()]),
    };
    const added = await addLineToCart(
      "token-1",
      { slug: "prod-1", variantSku: "PROD-1" },
      deps,
    );
    if (added.status !== "ok") throw new Error("unreachable");
    const result = await updateLineQuantity(
      "token-1",
      added.cart.lines[0].id,
      0,
      deps,
    );
    if (result.status !== "ok") throw new Error("unreachable");
    expect(result.cart.lines).toHaveLength(0);
  });

  it("removeLine removes a specific line", async () => {
    const deps = {
      cartRepository: fakeCartRepository(),
      productRepository: fakeProductRepository([product()]),
    };
    const added = await addLineToCart(
      "token-1",
      { slug: "prod-1", variantSku: "PROD-1" },
      deps,
    );
    if (added.status !== "ok") throw new Error("unreachable");
    const result = await removeLine("token-1", added.cart.lines[0].id, deps);
    if (result.status !== "ok") throw new Error("unreachable");
    expect(result.cart.lines).toHaveLength(0);
  });

  it("returns lineNotFound for an unknown lineId", async () => {
    const deps = {
      cartRepository: fakeCartRepository(),
      productRepository: fakeProductRepository([product()]),
    };
    await addLineToCart(
      "token-1",
      { slug: "prod-1", variantSku: "PROD-1" },
      deps,
    );
    const result = await updateLineQuantity(
      "token-1",
      "does-not-exist",
      1,
      deps,
    );
    expect(result).toEqual({ status: "lineNotFound" });
  });

  it("returns lineNotFound when there is no cart at all yet", async () => {
    const deps = {
      cartRepository: fakeCartRepository(),
      productRepository: fakeProductRepository([product()]),
    };
    const result = await updateLineQuantity(
      "token-1",
      "does-not-exist",
      1,
      deps,
    );
    expect(result).toEqual({ status: "lineNotFound" });
  });
});

describe("clearCart", () => {
  it("deletes the cart so a later getCart returns null", async () => {
    const deps = {
      cartRepository: fakeCartRepository(),
      productRepository: fakeProductRepository([product()]),
    };
    await addLineToCart(
      "token-1",
      { slug: "prod-1", variantSku: "PROD-1" },
      deps,
    );
    await clearCart("token-1", deps);
    expect(await getCart("token-1", deps)).toBeNull();
  });
});

describe("getCartView", () => {
  it("returns an empty view when there is no cart yet", async () => {
    const deps = {
      cartRepository: fakeCartRepository(),
      productRepository: fakeProductRepository([]),
    };
    const view = await getCartView("token-1", "uk", deps);
    expect(view).toEqual({ lines: [], currency: "UAH", count: 0, subtotal: 0 });
  });

  it("hydrates live price/orderability and computes totals from current price", async () => {
    const deps = {
      cartRepository: fakeCartRepository(),
      productRepository: fakeProductRepository([product()]),
    };
    await addLineToCart(
      "token-1",
      { slug: "prod-1", variantSku: "PROD-1", quantity: 2 },
      deps,
    );
    const view = await getCartView("token-1", "uk", deps);
    expect(view.count).toBe(2);
    expect(view.lines[0]).toMatchObject({
      productSlug: "prod-1",
      productName: "Тестовий товар",
      variantSku: "PROD-1",
      quantity: 2,
      unitPrice: 1000,
      currentPrice: 1000,
      priceChanged: false,
      orderable: true,
    });
    expect(view.subtotal).toBe(2000);
  });

  it("flags priceChanged when the live price has moved since the line was added", async () => {
    const cheapProduct = product({
      basePrice: { currency: "UAH", minorUnits: 100000 },
    });
    const deps = {
      cartRepository: fakeCartRepository(),
      productRepository: fakeProductRepository([cheapProduct]),
    };
    await addLineToCart(
      "token-1",
      { slug: "prod-1", variantSku: "PROD-1" },
      deps,
    );

    const expensiveProduct = product({
      basePrice: { currency: "UAH", minorUnits: 150000 },
    });
    deps.productRepository = fakeProductRepository([expensiveProduct]);

    const view = await getCartView("token-1", "uk", deps);
    expect(view.lines[0]).toMatchObject({
      unitPrice: 1000,
      currentPrice: 1500,
      priceChanged: true,
    });
    expect(view.subtotal).toBe(1500);
  });

  it("reports orderable: false and a null currentPrice when the product has since disappeared", async () => {
    const deps = {
      cartRepository: fakeCartRepository(),
      productRepository: fakeProductRepository([product()]),
    };
    await addLineToCart(
      "token-1",
      { slug: "prod-1", variantSku: "PROD-1" },
      deps,
    );
    deps.productRepository = fakeProductRepository([]);

    const view = await getCartView("token-1", "uk", deps);
    expect(view.lines[0]).toMatchObject({
      orderable: false,
      currentPrice: null,
      priceChanged: false,
    });
    expect(view.subtotal).toBe(1000);
  });
});
