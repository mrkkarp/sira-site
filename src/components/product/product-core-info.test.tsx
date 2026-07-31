import { describe, expect, it } from "vitest";
import { render, screen } from "@testing-library/react";
import { getDictionary } from "@/i18n/get-dictionary";
import { ProductCoreInfo } from "@/components/product/product-core-info";
import type { Product, ProductVariant } from "@/lib/schemas/product";

function product(overrides: Partial<Product> = {}): Product {
  return {
    slug: "odri",
    sku: "Odri",
    name: "Odri",
    sourceCategory: "Раковини/Підлогові",
    shopCategory: "sinks",
    specEntries: [],
    base: {
      sku: "Odri",
      price: 15150,
      photo: "/odri-base.jpg",
      description: "",
    },
    ...overrides,
  };
}

const baseVariant: ProductVariant = {
  sku: "Odri",
  colorLabel: "Сірий базовий",
  price: 15150,
  photo: "/odri-base.jpg",
  description: "",
};

describe("ProductCoreInfo", () => {
  it("renders real name/price/SKU and never a fabricated in-stock claim", async () => {
    const dictionary = await getDictionary("uk");
    render(
      <ProductCoreInfo
        product={product()}
        variant={baseVariant}
        priceDisplay={{ type: "fixed", amount: 15150, surcharge: 0 }}
        locale="uk"
        dictionary={dictionary}
      />,
    );
    expect(screen.getByRole("heading", { name: "Odri" })).toBeInTheDocument();
    expect(screen.getByText(dictionary.product.skuLabel)).toBeInTheDocument();
    // "Odri" appears twice by design: the product name heading and the real
    // SKU value happen to be the same string for this fixture.
    expect(screen.getAllByText("Odri")).toHaveLength(2);
    expect(
      screen.queryByText(dictionary.product.inStock),
    ).not.toBeInTheDocument();
    expect(
      screen.queryByText(dictionary.product.mayBeOutOfStock),
    ).not.toBeInTheDocument();
  });

  it("shows the may-be-out-of-stock badge and lead time only when the real variant data has them", async () => {
    const dictionary = await getDictionary("uk");
    render(
      <ProductCoreInfo
        product={product()}
        variant={{ ...baseVariant, mayBeOutOfStock: true, leadTimeWeeks: 2 }}
        priceDisplay={{ type: "from", amount: 15150, surcharge: 0 }}
        locale="uk"
        dictionary={dictionary}
      />,
    );
    expect(
      screen.getByText(dictionary.product.mayBeOutOfStock),
    ).toBeInTheDocument();
    expect(
      screen.getByText("Термін виготовлення — 2 тиж."),
    ).toBeInTheDocument();
    expect(
      screen.getByText(dictionary.shop.productCard.fromPricePrefix),
    ).toBeInTheDocument();
  });

  it("shows the real per-colour surcharge note for a custom colour", async () => {
    const dictionary = await getDictionary("uk");
    render(
      <ProductCoreInfo
        product={product()}
        variant={baseVariant}
        priceDisplay={{ type: "surcharge", amount: 18200, surcharge: 3050 }}
        locale="uk"
        dictionary={dictionary}
      />,
    );
    expect(
      screen.getByText(dictionary.product.colourSurchargeSuffix),
    ).toBeInTheDocument();
    // A surcharge is a per-colour add-on, never a "from" floor.
    expect(
      screen.queryByText(dictionary.shop.productCard.fromPricePrefix),
    ).not.toBeInTheDocument();
  });
});
