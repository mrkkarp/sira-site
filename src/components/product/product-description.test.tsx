import { describe, expect, it } from "vitest";
import { render, screen } from "@testing-library/react";
import { getDictionary } from "@/i18n/get-dictionary";
import { ProductDescription } from "@/components/product/product-description";

describe("ProductDescription", () => {
  it("renders the real intro section with its heading", async () => {
    const dictionary = await getDictionary("uk");
    render(
      <ProductDescription
        sections={[{ id: "intro", text: "Odri - підлогова бетонна раковина." }]}
        dictionary={dictionary}
      />,
    );
    expect(
      screen.getByText(dictionary.product.descriptionIntroHeading),
    ).toBeInTheDocument();
    expect(
      screen.getByText("Odri - підлогова бетонна раковина."),
    ).toBeInTheDocument();
  });

  it("renders nothing when there are no real sections", async () => {
    const dictionary = await getDictionary("uk");
    const { container } = render(
      <ProductDescription sections={[]} dictionary={dictionary} />,
    );
    expect(container).toBeEmptyDOMElement();
  });
});
