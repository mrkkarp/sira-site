import { describe, expect, it } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { getDictionary } from "@/i18n/get-dictionary";
import { ProductDetailsAccordion } from "@/components/product/product-details-accordion";
import type { Product } from "@/lib/schemas/product";

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

describe("ProductDetailsAccordion", () => {
  it("omits Характеристики/Монтаж when there are no real spec entries for this product", async () => {
    const dictionary = await getDictionary("uk");
    render(
      <ProductDetailsAccordion product={product()} dictionary={dictionary} />,
    );
    expect(
      screen.queryByText(dictionary.product.accordionSpecs),
    ).not.toBeInTheDocument();
    expect(
      screen.queryByText(dictionary.product.accordionInstallation),
    ).not.toBeInTheDocument();
    // Always-real sections still appear.
    expect(
      screen.getByText(dictionary.product.accordionDelivery),
    ).toBeInTheDocument();
    expect(
      screen.getByText(dictionary.product.accordionCare),
    ).toBeInTheDocument();
    expect(
      screen.getByText(dictionary.product.accordionWarranty),
    ).toBeInTheDocument();
    expect(
      screen.getByText(dictionary.product.accordionDocuments),
    ).toBeInTheDocument();
    // No fabricated FAQ section.
    expect(
      screen.queryByText(dictionary.product.accordionFaq),
    ).not.toBeInTheDocument();
  });

  it("leaves specs to the open spec sheet, and shows the honest no-documents message", async () => {
    const dictionary = await getDictionary("uk");
    render(
      <ProductDetailsAccordion
        product={product({
          specEntries: [
            {
              key: "material",
              label: "Матеріал",
              value: "архітектурний бетон",
            },
            {
              key: "mountType",
              label: "Монтаж",
              value: "накладний на стільницю",
            },
          ],
        })}
        dictionary={dictionary}
      />,
    );
    // Specs, dimensions and installation are rendered open above the fold
    // by ProductSpecSheet now; repeating them in a panel would print every
    // number twice.
    expect(
      screen.queryByRole("button", { name: dictionary.product.accordionSpecs }),
    ).not.toBeInTheDocument();
    expect(
      screen.queryByRole("button", {
        name: dictionary.product.accordionInstallation,
      }),
    ).not.toBeInTheDocument();

    fireEvent.click(
      screen.getByRole("button", {
        name: dictionary.product.accordionDocuments,
      }),
    );
    expect(
      screen.getByText(dictionary.product.noDocuments),
    ).toBeInTheDocument();
  });
});
