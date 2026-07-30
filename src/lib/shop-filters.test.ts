import { describe, expect, it } from "vitest";
import {
  parseFilters,
  serializeFilters,
  emptyFilterState,
  applyFilters,
  sortProducts,
  clearAllFilters,
  removeChip,
  listActiveChips,
  hasActiveFilters,
  computeMountFacet,
  computeColourFacet,
  intersectValidCollections,
  paginate,
  type FilterState,
} from "@/lib/shop-filters";
import type { Product } from "@/lib/schemas/product";

function product(overrides: Partial<Product>): Product {
  return {
    slug: "test",
    sku: "TEST",
    name: "Test",
    sourceCategory: "Раковини/Підлогові",
    shopCategory: "sinks",
    specEntries: [],
    base: { sku: "TEST", price: 1000, photo: "/a.jpg", description: "desc" },
    ...overrides,
  };
}

const catalog: Product[] = [
  product({
    slug: "free-a",
    name: "Alpha",
    sinkType: "freestanding",
    heightCm: 85,
    widthCm: 41,
    base: { sku: "free-a", price: 15150, photo: "/a.jpg", description: "" },
  }),
  product({
    slug: "free-b",
    name: "Beta",
    sinkType: "freestanding",
    heightCm: 85,
    widthCm: 60,
    base: { sku: "free-b", price: 17900, photo: "/b.jpg", description: "" },
    customColour: {
      sku: "free-b-color",
      price: 19600,
      photo: "/b.jpg",
      description: "",
    },
  }),
  product({
    slug: "counter-a",
    name: "Zeta",
    sinkType: "countertop",
    heightCm: 14,
    widthCm: 41,
    base: { sku: "counter-a", price: 5950, photo: "/c.jpg", description: "" },
  }),
];

describe("parseFilters", () => {
  it("parses a full, valid query string", () => {
    const params = Object.fromEntries(
      new URLSearchParams(
        "mount=freestanding&colour=custom&width=450-600&sort=price-asc&page=2",
      ),
    );
    const filters = parseFilters(params);
    expect(filters.mount).toEqual(["freestanding"]);
    expect(filters.colour).toEqual(["custom"]);
    expect(filters.width).toEqual({ min: 450, max: 600 });
    expect(filters.sort).toBe("price-asc");
    expect(filters.page).toBe(2);
  });

  it("ignores unknown/invalid enum values instead of crashing", () => {
    const params = Object.fromEntries(
      new URLSearchParams("mount=teleport&sort=most-popular"),
    );
    const filters = parseFilters(params);
    expect(filters.mount).toEqual([]);
    expect(filters.sort).toBe("featured");
  });

  it("keeps only the valid entries out of a mixed multi-value list", () => {
    const params = Object.fromEntries(
      new URLSearchParams("mount=freestanding,bogus,countertop"),
    );
    const filters = parseFilters(params);
    expect(filters.mount).toEqual(["freestanding", "countertop"]);
  });

  it("ignores a malformed range (min > max) rather than crashing", () => {
    const params = Object.fromEntries(new URLSearchParams("price=600-100"));
    expect(parseFilters(params).price).toBeUndefined();
  });

  it("ignores a non-numeric range", () => {
    const params = Object.fromEntries(
      new URLSearchParams("price=cheap-expensive"),
    );
    expect(parseFilters(params).price).toBeUndefined();
  });

  it("clamps an invalid page to 1", () => {
    expect(parseFilters({ page: "0" }).page).toBe(1);
    expect(parseFilters({ page: "-3" }).page).toBe(1);
    expect(parseFilters({ page: "abc" }).page).toBe(1);
  });

  it("defaults to an empty state when there are no params", () => {
    expect(parseFilters({})).toEqual(emptyFilterState());
  });
});

describe("serializeFilters", () => {
  it("emits params in the stable canonical order regardless of build order", () => {
    const filters: FilterState = {
      ...emptyFilterState(),
      sort: "price-asc",
      mount: ["freestanding"],
      colour: ["custom"],
    };
    expect(serializeFilters(filters)).toBe(
      "mount=freestanding&colour=custom&sort=price-asc",
    );
  });

  it("omits params at their default value", () => {
    expect(serializeFilters(emptyFilterState())).toBe("");
  });

  it("round-trips through parseFilters", () => {
    const original = parseFilters(
      Object.fromEntries(
        new URLSearchParams(
          "mount=freestanding&width=450-600&sort=price-desc&page=3",
        ),
      ),
    );
    const roundTripped = parseFilters(
      Object.fromEntries(new URLSearchParams(serializeFilters(original))),
    );
    expect(roundTripped).toEqual(original);
  });
});

describe("clearAllFilters / removeChip / listActiveChips", () => {
  it("clear all resets every facet but a non-default sort survives (only facets are 'filters')", () => {
    const filters: FilterState = {
      ...emptyFilterState(),
      mount: ["freestanding"],
      colour: ["custom"],
      sort: "price-asc",
      page: 3,
    };
    const cleared = clearAllFilters(filters);
    expect(cleared.mount).toEqual([]);
    expect(cleared.colour).toEqual([]);
    expect(cleared.page).toBe(1);
  });

  it("removing the only chip for a facet clears that param entirely", () => {
    const filters: FilterState = {
      ...emptyFilterState(),
      mount: ["freestanding"],
    };
    const chips = listActiveChips(filters);
    expect(chips).toEqual([{ key: "mount", value: "freestanding" }]);
    const next = removeChip(filters, chips[0]);
    expect(next.mount).toEqual([]);
    expect(hasActiveFilters(next)).toBe(false);
    expect(serializeFilters(next)).toBe("");
  });

  it("removing one chip out of several leaves the rest untouched", () => {
    const filters: FilterState = {
      ...emptyFilterState(),
      mount: ["freestanding", "countertop"],
    };
    const next = removeChip(filters, { key: "mount", value: "freestanding" });
    expect(next.mount).toEqual(["countertop"]);
  });

  it("removing a range chip clears the whole range", () => {
    const filters: FilterState = {
      ...emptyFilterState(),
      width: { min: 450, max: 600 },
    };
    const next = removeChip(filters, { key: "width", value: "450-600" });
    expect(next.width).toBeUndefined();
  });
});

describe("applyFilters", () => {
  it("filters by mount type", () => {
    const filters: FilterState = {
      ...emptyFilterState(),
      mount: ["countertop"],
    };
    const result = applyFilters(catalog, filters);
    expect(result.map((p) => p.slug)).toEqual(["counter-a"]);
  });

  it("filters by custom-colour availability", () => {
    const filters: FilterState = { ...emptyFilterState(), colour: ["custom"] };
    const result = applyFilters(catalog, filters);
    expect(result.map((p) => p.slug)).toEqual(["free-b"]);
  });

  it("filters by width range", () => {
    const filters: FilterState = {
      ...emptyFilterState(),
      width: { min: 50, max: 100 },
    };
    const result = applyFilters(catalog, filters);
    expect(result.map((p) => p.slug)).toEqual(["free-b"]);
  });

  it("combines multiple active facets with AND semantics", () => {
    const filters: FilterState = {
      ...emptyFilterState(),
      mount: ["freestanding"],
      width: { min: 50 },
    };
    const result = applyFilters(catalog, filters);
    expect(result.map((p) => p.slug)).toEqual(["free-b"]);
  });
});

describe("sortProducts", () => {
  it("sorts by price ascending/descending", () => {
    expect(sortProducts(catalog, "price-asc").map((p) => p.slug)).toEqual([
      "counter-a",
      "free-a",
      "free-b",
    ]);
    expect(sortProducts(catalog, "price-desc").map((p) => p.slug)).toEqual([
      "free-b",
      "free-a",
      "counter-a",
    ]);
  });

  it("sorts by name A-Z", () => {
    expect(sortProducts(catalog, "name-asc").map((p) => p.name)).toEqual([
      "Alpha",
      "Beta",
      "Zeta",
    ]);
  });

  it("'featured' preserves catalog order without mutating the input", () => {
    const copy = [...catalog];
    const result = sortProducts(catalog, "featured");
    expect(result).toEqual(copy);
    expect(result).not.toBe(catalog);
  });
});

describe("faceted counts", () => {
  it("marks a mount option disabled (count 0) once other filters exclude it", () => {
    const filters: FilterState = { ...emptyFilterState(), width: { min: 55 } };
    const facet = computeMountFacet(catalog, filters, () => []);
    const countertop = facet.find((f) => f.value === "countertop")!;
    expect(countertop.count).toBe(0);
    expect(countertop.disabled).toBe(true);
    const freestanding = facet.find((f) => f.value === "freestanding")!;
    expect(freestanding.count).toBe(1);
    expect(freestanding.disabled).toBe(false);
  });

  it("a facet's own active selection doesn't zero out its own sibling counts", () => {
    const filters: FilterState = {
      ...emptyFilterState(),
      mount: ["countertop"],
    };
    const facet = computeMountFacet(catalog, filters, () => []);
    // Even though only countertop is selected, freestanding's count is
    // computed ignoring the mount facet itself, so it stays enabled.
    expect(facet.find((f) => f.value === "freestanding")!.disabled).toBe(false);
  });

  it("colour facet counts custom-colour availability honestly (base is always available)", () => {
    const facet = computeColourFacet(catalog, emptyFilterState(), () => []);
    expect(facet.find((f) => f.value === "base")!.count).toBe(3);
    expect(facet.find((f) => f.value === "custom")!.count).toBe(1);
  });
});

describe("paginate", () => {
  const items = Array.from({ length: 25 }, (_, i) => i);

  it("slices the correct page", () => {
    const { pageItems, totalPages } = paginate(items, 2, 10);
    expect(pageItems).toEqual([10, 11, 12, 13, 14, 15, 16, 17, 18, 19]);
    expect(totalPages).toBe(3);
  });

  it("clamps an out-of-range page down to the last valid page", () => {
    const { pageItems, currentPage } = paginate(items, 99, 10);
    expect(currentPage).toBe(3);
    expect(pageItems).toEqual([20, 21, 22, 23, 24]);
  });

  it("never produces zero total pages, even for an empty list", () => {
    expect(paginate([], 1, 10).totalPages).toBe(1);
  });
});

describe("intersectValidCollections", () => {
  it("drops a collection slug that no longer exists in real data", () => {
    const filters: FilterState = {
      ...emptyFilterState(),
      collection: ["outdoor", "ghost-collection"],
    };
    const next = intersectValidCollections(filters, ["outdoor", "minimalism"]);
    expect(next.collection).toEqual(["outdoor"]);
  });
});
