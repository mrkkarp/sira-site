import { describe, expect, it } from "vitest";
import { render, screen } from "@testing-library/react";
import { getDictionary } from "@/i18n/get-dictionary";
import { ProductSpecSheet } from "@/components/product/product-spec-sheet";

describe("ProductSpecSheet", () => {
  it("shows dimensions and specifications open, with nothing to click", async () => {
    const dictionary = await getDictionary("uk");
    render(
      <ProductSpecSheet
        dictionary={dictionary}
        specEntries={[
          { key: "height", label: "Висота", value: "85 см" },
          { key: "diameter", label: "Діаметр", value: "60 см" },
          { key: "weight", label: "Вага", value: "100 кг" },
          { key: "volume", label: "Об'єм", value: "175 л" },
        ]}
      />,
    );
    expect(
      screen.getByRole("heading", {
        name: dictionary.product.specSheetHeading,
      }),
    ).toBeInTheDocument();
    for (const value of ["85 см", "60 см", "100 кг", "175 л"]) {
      expect(screen.getByText(value)).toBeVisible();
    }
    expect(screen.queryByRole("button")).not.toBeInTheDocument();
  });

  it("renders nothing for a product with no specs", async () => {
    const dictionary = await getDictionary("uk");
    const { container } = render(
      <ProductSpecSheet dictionary={dictionary} specEntries={[]} />,
    );
    expect(container).toBeEmptyDOMElement();
  });
});
