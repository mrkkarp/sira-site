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
        priceDisplay={{ type: "fixed", amount: 15150 }}
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

  it("says nothing about stock even for a variant the source flagged, and still shows the lead time", async () => {
    // `mayBeOutOfStock` is still parsed and still reaches the Payload admin as
    // `stockNote`; it is the *badge* the owner asked for gone. Passing the flag
    // as `true` here is the point of the test — the assertion has to fail if
    // someone wires the data back to a badge, not merely if the flag is
    // missing. `dictionary.product.inStock` and `.mayBeOutOfStock` survive in
    // the dictionaries for exactly this: they are the two claims this page must
    // never make, and naming them here is what keeps them checkable.
    const dictionary = await getDictionary("uk");
    render(
      <ProductCoreInfo
        product={product()}
        variant={{ ...baseVariant, mayBeOutOfStock: true, leadTimeWeeks: 2 }}
        priceDisplay={{ type: "from", amount: 15150 }}
        locale="uk"
        dictionary={dictionary}
      />,
    );
    expect(
      screen.queryByText(dictionary.product.mayBeOutOfStock),
    ).not.toBeInTheDocument();
    expect(screen.queryByText(/відсутн/i)).not.toBeInTheDocument();
    expect(
      screen.getByText("Термін виготовлення — 2 тиж."),
    ).toBeInTheDocument();
    expect(
      screen.getByText(dictionary.shop.productCard.fromPricePrefix),
    ).toBeInTheDocument();
  });
});
