import { describe, expect, it } from "vitest";
import { render, screen } from "@testing-library/react";
import { ProductSpecs } from "@/components/product/product-specs";

describe("ProductSpecs", () => {
  it("renders real label/value spec entries", () => {
    render(
      <ProductSpecs
        specEntries={[
          { label: "Матеріал", value: "архітектурний бетон" },
          { label: "Висота", value: "85 см" },
        ]}
      />,
    );
    expect(screen.getByText("Матеріал")).toBeInTheDocument();
    expect(screen.getByText("архітектурний бетон")).toBeInTheDocument();
    expect(screen.getByText("Висота")).toBeInTheDocument();
    expect(screen.getByText("85 см")).toBeInTheDocument();
  });

  it("renders nothing for a product with no real spec entries", () => {
    const { container } = render(<ProductSpecs specEntries={[]} />);
    expect(container).toBeEmptyDOMElement();
  });
});
