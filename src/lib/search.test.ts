import { describe, expect, it } from "vitest";
import type { Product } from "@/lib/schemas/product";
import type { ProductColour } from "@/lib/schemas/colour";
import { getDictionary } from "@/i18n/get-dictionary";
import { searchCatalog } from "@/lib/search";

const product = (overrides: Partial<Product> = {}): Product => ({
  slug: "odri-nakladna",
  sku: "ODRI-1",
  name: "Odri",
  sourceCategory: "Раковини/Накладні",
  shopCategory: "sinks",
  specEntries: [],
  base: {
    sku: "ODRI-1",
    price: 5000,
    photo: "https://example.com/odri.jpg",
    description: "Раковина Odri.",
  },
  ...overrides,
});

const colour = (overrides: Partial<ProductColour> = {}): ProductColour => ({
  slug: "terracotta",
  displayName: "Терракота",
  digitalPreviewHex: "#B25D3A",
  textMode: "light",
  availableCategories: ["sinks"],
  physicalSampleAvailable: true,
  disclaimer: "Колір на екрані — орієнтовний.",
  demo: false,
  ...overrides,
});

describe("searchCatalog", () => {
  it("returns nothing (never all products) for an empty/whitespace query", async () => {
    const dictionary = await getDictionary("uk");
    expect(
      searchCatalog("   ", { products: [product()], colours: [], dictionary }),
    ).toEqual({
      products: [],
      pages: [],
    });
  });

  it("matches a product by its real name (case-insensitively)", async () => {
    const dictionary = await getDictionary("uk");
    const result = searchCatalog("ODRI", {
      products: [product()],
      colours: [],
      dictionary,
    });
    expect(result.products).toEqual([product()]);
  });

  it("matches a product by its real sku", async () => {
    const dictionary = await getDictionary("uk");
    const result = searchCatalog("odri-1", {
      products: [product()],
      colours: [],
      dictionary,
    });
    expect(result.products).toHaveLength(1);
  });

  it("matches a product by its real (raw, untranslated) source category", async () => {
    const dictionary = await getDictionary("uk");
    const result = searchCatalog("накладні", {
      products: [product()],
      colours: [],
      dictionary,
    });
    expect(result.products).toHaveLength(1);
  });

  it("broadens the match via a real colour name shared with the query, never inventing a per-product colour tag", async () => {
    const dictionary = await getDictionary("uk");
    const matchless = product({
      name: "Zeta",
      sku: "ZETA-1",
      sourceCategory: "Вазони/До дому",
    });
    const result = searchCatalog("терракота", {
      products: [matchless],
      colours: [colour()],
      dictionary,
    });
    // Nothing in `matchless`'s own fields mentions "терракота" — this only
    // matches because the query itself is a real colour name from the
    // shared vocabulary, per the documented best-effort broadening.
    expect(result.products).toHaveLength(0);
  });

  it("returns no product match when neither the product nor any real colour name mentions the query", async () => {
    const dictionary = await getDictionary("uk");
    const result = searchCatalog("щось випадкове", {
      products: [product()],
      colours: [colour()],
      dictionary,
    });
    expect(result.products).toHaveLength(0);
  });

  it("caps product matches at the given limit", async () => {
    const dictionary = await getDictionary("uk");
    const products = Array.from({ length: 10 }, (_, i) =>
      product({ slug: `odri-${i}`, sku: `ODRI-${i}`, name: "Odri" }),
    );
    const result = searchCatalog("odri", {
      products,
      colours: [],
      dictionary,
      limit: 3,
    });
    expect(result.products).toHaveLength(3);
  });

  it("matches a real static page by its translated dictionary label", async () => {
    const dictionary = await getDictionary("uk");
    const result = searchCatalog("каталог", {
      products: [],
      colours: [],
      dictionary,
    });
    expect(result.pages).toEqual([
      { title: dictionary.pages.shop, href: "/shop" },
    ]);
  });

  it("never returns collections/projects matches — no real backing data exists for those yet", async () => {
    const dictionary = await getDictionary("uk");
    const result = searchCatalog("проєкт", {
      products: [],
      colours: [],
      dictionary,
    });
    // "Проєкти" is a real dictionary label, so it's a legitimate `pages` hit —
    // but there is no separate `collections`/`projects` result group at all
    // in this module's output, by design.
    expect(result).not.toHaveProperty("collections");
    expect(result).not.toHaveProperty("projects");
  });
});
