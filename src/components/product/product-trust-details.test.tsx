import { describe, expect, it } from "vitest";
import { render, screen } from "@testing-library/react";
import { getDictionary } from "@/i18n/get-dictionary";
import { ProductTrustDetails } from "@/components/product/product-trust-details";

describe("ProductTrustDetails", () => {
  it("shows colour matching only when the product genuinely has a custom-colour option", async () => {
    const dictionary = await getDictionary("uk");
    const { rerender } = render(
      <ProductTrustDetails hasColourMatching={false} dictionary={dictionary} />,
    );
    expect(
      screen.getByText(dictionary.product.trustMadeInKyiv),
    ).toBeInTheDocument();
    expect(
      screen.getByText(dictionary.product.trustConsultation),
    ).toBeInTheDocument();
    expect(
      screen.queryByText(dictionary.product.trustColourMatching),
    ).not.toBeInTheDocument();

    rerender(
      <ProductTrustDetails hasColourMatching={true} dictionary={dictionary} />,
    );
    expect(
      screen.getByText(dictionary.product.trustColourMatching),
    ).toBeInTheDocument();
  });
});
