import { describe, expect, it } from "vitest";
import { render, screen } from "@testing-library/react";
import { getDictionary } from "@/i18n/get-dictionary";
import { ProductRelated } from "@/components/product/product-related";
import type { Product } from "@/lib/schemas/product";

function product(slug: string): Product {
  return {
    slug,
    sku: slug.toUpperCase(),
    name: slug,
    sourceCategory: "Раковини/Підлогові",
    shopCategory: "sinks",
    specEntries: [],
    base: {
      sku: slug.toUpperCase(),
      price: 1000,
      photo: `/${slug}.jpg`,
      description: "",
    },
  };
}

describe("ProductRelated", () => {
  it("renders nothing when there is no section", async () => {
    const dictionary = await getDictionary("uk");
    const { container } = render(
      <ProductRelated
        section={undefined}
        locale="uk"
        dictionary={dictionary}
      />,
    );
    expect(container).toBeEmptyDOMElement();
  });

  it("renders the matching heading and a card per related product", async () => {
    const dictionary = await getDictionary("uk");
    render(
      <ProductRelated
        section={{
          headingKey: "relatedCompleteTheSet",
          products: [product("solo"), product("mira")],
        }}
        locale="uk"
        dictionary={dictionary}
      />,
    );
    expect(
      screen.getByRole("heading", {
        name: dictionary.product.relatedCompleteTheSet,
      }),
    ).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: "solo" })).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: "mira" })).toBeInTheDocument();
  });
});
