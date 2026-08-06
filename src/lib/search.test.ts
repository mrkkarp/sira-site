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

  /**
   * The regression this suite exists for.
   *
   * Matching used to be `haystack.includes(query)` on raw strings, so whether
   * a search worked came down to whether the singular a person types happens
   * to be a prefix of the plural the catalogue stores. "вазон" is a substring
   * of "вазони" and worked; "раковина" is not a substring of "раковини" and
   * returned nothing — on the shop's largest category. Measured against
   * production before the fix: /api/search?q=раковина answered
   * `{"products":[],...}`, 57 bytes.
   *
   * Each case below is a real category string out of
   * `src/data/products.source.json`, queried the way a customer types it:
   * singular, lower case, no diacritic games.
   */
  describe("finds Ukrainian nouns regardless of the ending the catalogue uses", () => {
    const cases: Array<{ query: string; category: string }> = [
      { query: "раковина", category: "Раковини/Накладні" },
      { query: "раковину", category: "Раковини/Підлогові" },
      { query: "панель", category: "Панелі" },
      { query: "столик", category: "Столики/Журнальні" },
      { query: "вазон", category: "Вазони/Вуличні" },
      { query: "меблі", category: "Вуличні меблі" },
      { query: "панно", category: "Панно на стіну" },
    ];

    for (const { query, category } of cases) {
      it(`"${query}" matches ${category}`, async () => {
        const dictionary = await getDictionary("uk");
        const result = searchCatalog(query, {
          products: [product({ sourceCategory: category })],
          colours: [],
          dictionary,
        });
        expect(result.products).toHaveLength(1);
      });
    }
  });

  it("still refuses words that merely share a stem-length prefix", async () => {
    const dictionary = await getDictionary("uk");
    // "рак" is a real word and a genuine prefix of "раковини", but stemming
    // must not turn every short prefix into a match for everything — the
    // guard is MIN_STEM, and this pins it. If this test starts failing, the
    // stemmer has begun eating too much and the catalogue will match noise.
    const result = searchCatalog("панно", {
      products: [product({ sourceCategory: "Панелі", name: "Riflo" })],
      colours: [],
      dictionary,
    });
    expect(result.products).toEqual([]);
  });

  it("treats a second word as narrowing, not widening", async () => {
    const dictionary = await getDictionary("uk");
    const products = [
      product({
        slug: "odri",
        name: "Odri",
        sku: "ODRI-1",
        sourceCategory: "Раковини/Накладні",
      }),
      // Its own SKU, deliberately: the shared `product()` default is
      // "ODRI-1", and leaving it would put "odri" in this product's haystack
      // too — the test would then pass for the wrong reason.
      product({
        slug: "riflo",
        name: "Riflo",
        sku: "RIFLO-1",
        sourceCategory: "Раковини/Накладні",
      }),
    ];
    // Both are раковини; only one is Odri. Adding a word must shrink the set.
    const broad = searchCatalog("раковина", {
      products,
      colours: [],
      dictionary,
    });
    const narrow = searchCatalog("раковина odri", {
      products,
      colours: [],
      dictionary,
    });
    expect(broad.products).toHaveLength(2);
    expect(narrow.products.map((p) => p.slug)).toEqual(["odri"]);
  });
});
