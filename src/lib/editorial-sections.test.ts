import { describe, expect, it } from "vitest";
import { getDictionary } from "@/i18n/get-dictionary";
import { buildEditorialSections } from "@/lib/editorial-sections";
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
      description: "Odri - опис.\nХарактеристики\n-\nМатеріал: бетон",
    },
    ...overrides,
  };
}

describe("buildEditorialSections", () => {
  it("builds a category section and a craft section from the real per-product intro text", async () => {
    const dictionary = await getDictionary("uk");
    const sections = buildEditorialSections(product(), dictionary);
    expect(sections.map((s) => s.id)).toEqual(["category", "craft"]);
    expect(sections[1].body).toBe("Odri - опис.");
  });

  it("adds a colour section only for products with a real custom-colour variant, with that variant's own photo", async () => {
    const dictionary = await getDictionary("uk");
    const withColour = product({
      customColour: {
        sku: "Odri color",
        colorLabel: "Свій колір",
        price: 18200,
        photo: "/odri-custom.jpg",
        description: "",
      },
    });
    const sections = buildEditorialSections(withColour, dictionary);
    expect(sections.map((s) => s.id)).toEqual(["category", "craft", "colour"]);
    const colourSection = sections.find((s) => s.id === "colour");
    expect(colourSection?.photo).toBe("/odri-custom.jpg");
    expect(colourSection?.photoAlt).toBe("Свій колір");
  });

  it("never produces identical section sets for two different real products", async () => {
    const dictionary = await getDictionary("uk");
    const odri = buildEditorialSections(product(), dictionary);
    const other = buildEditorialSections(
      product({
        slug: "solo",
        name: "Solo",
        base: {
          sku: "SOLO",
          price: 9000,
          photo: "/solo.jpg",
          description: "Solo - інший опис.\nХарактеристики\n-\nМатеріал: бетон",
        },
      }),
      dictionary,
    );
    expect(odri[1].body).not.toBe(other[1].body);
  });
});
