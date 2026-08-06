import { describe, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";
import type { Product } from "@/lib/schemas/product";
import { GET } from "./route";

const odri: Product = {
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
};

// The catalogue itself is not what this file is about — `searchCatalog` has
// its own suite over the real matching rules in `src/lib/search.test.ts`.
vi.mock("@/lib/products", () => ({
  getAllProductsAsync: async () => [odri],
}));
vi.mock("@/lib/product-colours", () => ({
  getAllProductColours: () => [],
}));

function get(url: string) {
  return GET(new NextRequest(url));
}

/**
 * The header drawer fires one of these per debounced keystroke, so the same
 * few prefixes are asked for over and over by everyone who searches. Before
 * this header the route answered `public, max-age=0, must-revalidate` and
 * every request in production was `x-vercel-cache: MISS` — a function
 * invocation in Washington per letter typed in Kyiv.
 *
 * These tests pin the header, not the CDN: what we control is what we
 * promise. The one thing that would make the promise wrong is the response
 * depending on something outside the URL — a cookie, a session, a header —
 * because the CDN keys on the URL alone. There is no such input today, and
 * the empty-query test below is what would notice if one appeared.
 */
describe("GET /api/search caching", () => {
  it("lets the CDN reuse a result, and the browser reuse it briefly", async () => {
    const response = await get("http://localhost:3000/api/search?q=odri");
    const cacheControl = response.headers.get("cache-control") ?? "";

    expect(cacheControl).toContain("public");
    // Must be a shared cache directive: `max-age` alone would only ever be
    // reused inside one browser, which is the case that matters least.
    expect(cacheControl).toContain("s-maxage=300");
    expect(cacheControl).toContain("stale-while-revalidate=600");
  });

  it("never lets the edge outlive the catalogue cache underneath it", async () => {
    // `payload-flat-products.ts` revalidates the catalogue every 300s, and the
    // CDN does not observe `revalidateTag` (see `cdn-caching.md`). An
    // `s-maxage` above that would make the edge the staler of the two layers
    // with nothing able to clear it — the failure mode being a wrong price in
    // the search drawer long after the admin fixed it.
    const response = await get("http://localhost:3000/api/search?q=odri");
    const sMaxAge = Number(
      /s-maxage=(\d+)/.exec(response.headers.get("cache-control") ?? "")?.[1],
    );
    expect(sMaxAge).toBeLessThanOrEqual(300);
  });

  it("caches the empty-query answer too, instead of paying a function for []", async () => {
    const response = await get("http://localhost:3000/api/search?q=%20%20");
    expect(response.headers.get("cache-control")).toContain("s-maxage");
    await expect(response.json()).resolves.toEqual({
      products: [],
      collections: [],
      projects: [],
      pages: [],
    });
  });

  it("still returns the real results it is now allowed to cache", async () => {
    const response = await get(
      "http://localhost:3000/api/search?q=%D1%80%D0%B0%D0%BA%D0%BE%D0%B2%D0%B8%D0%BD%D0%B0&locale=uk",
    );
    const body = await response.json();
    // "раковина" against the stored "Раковини/Накладні" — the exact query that
    // returned nothing in production until the stemmer landed. Caching an
    // empty answer would have been worse than not caching at all.
    expect(body.products).toHaveLength(1);
    expect(body.products[0].slug).toBe("odri-nakladna");
  });
});
