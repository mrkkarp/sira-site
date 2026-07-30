import { describe, expect, it, vi, beforeEach } from "vitest";
import { NextRequest } from "next/server";
import { __resetRateLimitForTests } from "@/lib/forms/rate-limit";
import { POST } from "./route";

const ensureCartSessionTokenMock = vi.fn();
const addLineToCartMock = vi.fn();
const getCartViewMock = vi.fn();

vi.mock("@/lib/cart-session", () => ({
  ensureCartSessionToken: () => ensureCartSessionTokenMock(),
}));

vi.mock("@/services/cart-service", () => ({
  addLineToCart: (token: string, input: unknown) =>
    addLineToCartMock(token, input),
  getCartView: (token: string, locale: string) =>
    getCartViewMock(token, locale),
}));

function makeRequest(body: unknown, headers: Record<string, string> = {}) {
  return new NextRequest("http://localhost:3000/api/cart/lines", {
    method: "POST",
    headers: {
      host: "localhost:3000",
      "content-type": "application/json",
      ...headers,
    },
    body: JSON.stringify(body),
  });
}

/**
 * Phase J hardening — `POST /api/cart/lines` (add to cart) had no
 * CSRF/rate-limit guard at all. Covers just the guard behavior; the
 * happy-path add/price-resolution logic is `cart-service`'s own concern.
 */
describe("POST /api/cart/lines", () => {
  beforeEach(() => {
    __resetRateLimitForTests();
    ensureCartSessionTokenMock.mockReset().mockResolvedValue("token-1");
    addLineToCartMock.mockReset().mockResolvedValue({ status: "ok" });
    getCartViewMock
      .mockReset()
      .mockResolvedValue({ lines: [], currency: "UAH", count: 0, subtotal: 0 });
  });

  it("adds a line for a real same-origin request", async () => {
    const response = await POST(
      makeRequest({ slug: "odri", variantSku: "odri-60" }),
    );
    const json = await response.json();
    expect(json.ok).toBe(true);
    expect(addLineToCartMock).toHaveBeenCalledWith("token-1", {
      slug: "odri",
      variantSku: "odri-60",
    });
  });

  it("rejects a cross-origin request without touching the cart", async () => {
    const response = await POST(
      makeRequest(
        { slug: "odri", variantSku: "odri-60" },
        { origin: "https://evil.example" },
      ),
    );
    expect(response.status).toBe(403);
    expect(addLineToCartMock).not.toHaveBeenCalled();
  });

  it("rate-limits repeated requests from the same client", async () => {
    for (let i = 0; i < 5; i++)
      await POST(makeRequest({ slug: "odri", variantSku: "odri-60" }));
    const response = await POST(
      makeRequest({ slug: "odri", variantSku: "odri-60" }),
    );
    expect(response.status).toBe(429);
  });
});
