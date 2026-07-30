import { describe, expect, it } from "vitest";
import {
  ProductId,
  VariantId,
  CategoryId,
  OptionId,
} from "@/domain/shared/ids";
import type { Product } from "@/domain/catalog/product";
import type { ProductRepository } from "@/repositories/product-repository";
import {
  getProductBySlug,
  getProductById,
  listProducts,
  listProductsByCategory,
  resolveVariantBySlug,
  priceAndAvailability,
} from "./product-service";

/**
 * Unlike the repository-layer tests (which exercise a real
 * `Payload*Repository` mapper against fixture Payload docs), this suite
 * never touches Payload or the JSON snapshot at all: every export under
 * test takes an optional `repository` param, so a hand-rolled in-memory
 * fake — implementing just the 4-method `ProductRepository` interface —
 * is injected directly. This is the DI seam `product-service.ts`'s own
 * doc comment calls out, and it's what keeps these tests fast and free
 * of the `CATALOG_SOURCE` env var / module-level repository cache.
 */
function fakeRepository(products: Product[]): ProductRepository {
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
    async findByCategorySlug(categorySlug: string) {
      // Fixture products key their category by the CategoryId's own string value,
      // mirroring how a real repository would resolve a category slug to an id first.
      return products.filter(
        (p) => p.categoryId === CategoryId.parse(categorySlug),
      );
    },
  };
}

const oneOff = (overrides: Partial<Product> = {}): Product => ({
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

describe("getProductBySlug / listProducts / listProductsByCategory", () => {
  const products = [
    oneOff(),
    oneOff({
      id: ProductId.parse("prod-2"),
      slug: "prod-2",
      sku: "PROD-2",
      categoryId: CategoryId.parse("cat-2"),
    }),
  ];

  it("finds a product by slug via the injected repository", async () => {
    const result = await getProductBySlug("prod-2", fakeRepository(products));
    expect(result?.slug).toBe("prod-2");
  });

  it("returns null when no product matches the slug", async () => {
    const result = await getProductBySlug(
      "does-not-exist",
      fakeRepository(products),
    );
    expect(result).toBeNull();
  });

  it("lists all products via the injected repository", async () => {
    const result = await listProducts(fakeRepository(products));
    expect(result).toHaveLength(2);
  });

  it("filters by category via the injected repository", async () => {
    const result = await listProductsByCategory(
      "cat-2",
      fakeRepository(products),
    );
    expect(result).toEqual([products[1]]);
  });

  it("finds a product by id via the injected repository", async () => {
    const result = await getProductById(
      products[1].id,
      fakeRepository(products),
    );
    expect(result?.slug).toBe("prod-2");
  });
});

describe("resolveVariantBySlug", () => {
  it("returns notFound when the slug doesn't resolve to a product", async () => {
    const result = await resolveVariantBySlug(
      "missing",
      {},
      fakeRepository([]),
    );
    expect(result).toEqual({ status: "notFound" });
  });

  it("delegates to resolveVariantForProduct and bundles the product on success", async () => {
    const product = oneOff();
    const result = await resolveVariantBySlug(
      "prod-1",
      {},
      fakeRepository([product]),
    );
    expect(result).toEqual({
      status: "resolved",
      variant: product.variants[0],
      product,
    });
  });

  it("bundles the product even on an incomplete/unavailable resolution", async () => {
    const product = oneOff({
      options: [
        {
          id: OptionId.parse("opt-colour"),
          key: "colour",
          label: { uk: "Колір" },
          values: [{ value: "grey", label: { uk: "Сірий" } }],
        },
      ],
    });
    const result = await resolveVariantBySlug(
      "prod-1",
      {},
      fakeRepository([product]),
    );
    expect(result.status).toBe("incomplete");
    expect((result as { product: Product }).product).toBe(product);
  });
});

describe("priceAndAvailability", () => {
  it("bundles effectivePrice and isVariantOrderable for a call site that needs both", () => {
    const product = oneOff();
    const [variant] = product.variants;
    expect(priceAndAvailability(product, variant)).toEqual({
      price: product.basePrice,
      orderable: true,
    });
  });

  it("reports orderable: false and a null price for an unavailable, priceless variant", () => {
    const product = oneOff({ basePrice: null });
    const variant = {
      ...product.variants[0],
      price: null,
      inventory: { status: "unavailable" as const, reason: "Немає на складі" },
    };
    expect(priceAndAvailability(product, variant)).toEqual({
      price: null,
      orderable: false,
    });
  });
});
