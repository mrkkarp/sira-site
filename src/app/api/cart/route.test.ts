import { describe, expect, it, vi, beforeEach } from "vitest";
import { NextRequest } from "next/server";
import { __resetRateLimitForTests } from "@/lib/forms/rate-limit";
import { DELETE } from "./route";

const readCartSessionTokenMock = vi.fn();
const clearCartMock = vi.fn();

vi.mock("@/lib/cart-session", () => ({
  readCartSessionToken: () => readCartSessionTokenMock(),
}));

vi.mock("@/services/cart-service", () => ({
  clearCart: (token: string) => clearCartMock(token),
  getCartView: vi.fn(),
}));

function makeRequest(headers: Record<string, string> = {}) {
  return new NextRequest("http://localhost:3000/api/cart", {
    method: "DELETE",
    headers: { host: "localhost:3000", ...headers },
  });
}

/**
 * Phase J hardening — `DELETE /api/cart` (the "empty cart" action) had no
 * CSRF/rate-limit guard at all, unlike every other public mutation route
 * in the app. Covers just the guard behavior; `clearCart`/`getCartView`
 * are mocked since they're already covered by `cart-service` itself.
 */
describe("DELETE /api/cart", () => {
  beforeEach(() => {
    __resetRateLimitForTests();
    readCartSessionTokenMock.mockReset().mockResolvedValue("token-1");
    clearCartMock.mockReset();
  });

  it("clears the cart for a real same-origin request", async () => {
    const response = await DELETE(makeRequest());
    const json = await response.json();
    expect(json.ok).toBe(true);
    expect(clearCartMock).toHaveBeenCalledWith("token-1");
  });

  it("rejects a cross-origin request without touching the cart", async () => {
    const response = await DELETE(
      makeRequest({ origin: "https://evil.example" }),
    );
    expect(response.status).toBe(403);
    expect(clearCartMock).not.toHaveBeenCalled();
  });

  it("rate-limits repeated requests from the same client", async () => {
    for (let i = 0; i < 5; i++) await DELETE(makeRequest());
    const response = await DELETE(makeRequest());
    expect(response.status).toBe(429);
  });
});
