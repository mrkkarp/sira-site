import { describe, expect, it, vi, beforeEach } from "vitest";
import { renderHook, act, waitFor } from "@testing-library/react";
import { useCart, __resetCartStoreForTests } from "@/lib/cart-store";

/**
 * `cart-store` (Phase D) is a thin client cache in front of the
 * server-persisted `/api/cart/*` routes — it never computes a line's
 * name/price itself, so these tests mock `fetch` and assert the store
 * mirrors back whatever view the server returned, rather than
 * simulating cart math client-side.
 */
const line = {
  id: "line-1",
  productSlug: "odri",
  productName: "Odri",
  variantSku: "Odri",
  variantLabel: "Сірий",
  quantity: 1,
  unitPrice: 15150,
  currentPrice: 15150,
  priceChanged: false,
  orderable: true,
  currency: "UAH",
};

const emptyView = { lines: [], currency: "UAH", count: 0, subtotal: 0 };
const oneLineView = {
  lines: [line],
  currency: "UAH",
  count: 1,
  subtotal: 15150,
};

function jsonResponse(body: unknown) {
  return { ok: true, json: async () => body } as Response;
}

describe("useCart", () => {
  beforeEach(() => {
    vi.restoreAllMocks();
    __resetCartStoreForTests();
  });

  it("starts empty before hydration resolves", () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue(jsonResponse({ ok: true, view: emptyView })),
    );
    const { result } = renderHook(() => useCart());
    expect(result.current.count).toBe(0);
    expect(result.current.items).toEqual([]);
  });

  it("hydrates from the server-persisted cart on mount", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue(jsonResponse({ ok: true, view: oneLineView })),
    );
    const { result } = renderHook(() => useCart());

    await waitFor(() => expect(result.current.isLoading).toBe(false));
    expect(result.current.count).toBe(1);
    expect(result.current.subtotal).toBe(15150);
    expect(result.current.items[0]).toMatchObject({
      id: "line-1",
      productSlug: "odri",
    });
  });

  it("adds an item by posting to /api/cart/lines and reflects the server's real view", async () => {
    const fetchMock = vi
      .fn()
      .mockImplementation((url: string, init?: RequestInit) => {
        if (init?.method === "POST")
          return Promise.resolve(jsonResponse({ ok: true, view: oneLineView }));
        return Promise.resolve(jsonResponse({ ok: true, view: emptyView }));
      });
    vi.stubGlobal("fetch", fetchMock);

    const { result } = renderHook(() => useCart());
    await waitFor(() => expect(result.current.isLoading).toBe(false));

    await act(async () => {
      await result.current.addItem({ slug: "odri", variantSku: "Odri" });
    });

    expect(result.current.count).toBe(1);
    expect(result.current.subtotal).toBe(15150);
    const [, init] = fetchMock.mock.calls.find(([url]) =>
      (url as string).startsWith("/api/cart/lines"),
    )!;
    expect(JSON.parse((init as RequestInit).body as string)).toEqual({
      slug: "odri",
      variantSku: "Odri",
      quantity: 1,
    });
  });

  it("removes an item by deleting /api/cart/lines/:lineId", async () => {
    const fetchMock = vi
      .fn()
      .mockImplementation((url: string, init?: RequestInit) => {
        if (init?.method === "DELETE" && (url as string).includes("/lines/")) {
          return Promise.resolve(jsonResponse({ ok: true, view: emptyView }));
        }
        return Promise.resolve(jsonResponse({ ok: true, view: oneLineView }));
      });
    vi.stubGlobal("fetch", fetchMock);

    const { result } = renderHook(() => useCart());
    await waitFor(() => expect(result.current.isLoading).toBe(false));
    expect(result.current.count).toBe(1);

    await act(async () => {
      await result.current.removeItem("line-1");
    });

    expect(result.current.items).toEqual([]);
    expect(result.current.count).toBe(0);
    const deleteCall = fetchMock.mock.calls.find(
      ([, init]) => (init as RequestInit)?.method === "DELETE",
    );
    expect(deleteCall![0]).toContain("/api/cart/lines/line-1");
  });

  it("does not let the slow initial fetch overwrite an add that raced ahead of it", async () => {
    // The real sequence this reproduces: the mount GET goes out, the visitor
    // adds an item before it comes back, the POST answers first, and only then
    // does the GET arrive — carrying the empty cart it was always going to
    // return. Both responses are complete carts, so without an ordering rule
    // the late one wins and the item vanishes from the badge and the cart page,
    // even though it is sitting safely in Postgres. On a fast connection the
    // window is small, which is precisely why it went unnoticed: it showed up
    // as an occasional red E2E run rather than as a bug.
    let releaseInitialGet: (() => void) | undefined;
    const initialGetArrives = new Promise<void>((resolve) => {
      releaseInitialGet = resolve;
    });

    vi.stubGlobal(
      "fetch",
      vi.fn().mockImplementation(async (_url: string, init?: RequestInit) => {
        if (init?.method === "POST") {
          return jsonResponse({ ok: true, view: oneLineView });
        }
        await initialGetArrives;
        return jsonResponse({ ok: true, view: emptyView });
      }),
    );

    const { result } = renderHook(() => useCart());

    await act(async () => {
      await result.current.addItem({ slug: "odri", variantSku: "Odri" });
    });
    expect(result.current.count).toBe(1);

    await act(async () => {
      releaseInitialGet!();
      await initialGetArrives;
    });

    expect(result.current.count).toBe(1);
    expect(result.current.items).toHaveLength(1);
  });

  it("shares the persisted cart across a fresh hook instance (simulating a reload)", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue(jsonResponse({ ok: true, view: oneLineView })),
    );

    const first = renderHook(() => useCart());
    await waitFor(() => expect(first.result.current.isLoading).toBe(false));

    const second = renderHook(() => useCart());
    expect(second.result.current.count).toBe(1);
  });
});
