import { describe, expect, it, vi, beforeEach } from "vitest";
import { NextRequest } from "next/server";
import { __resetRateLimitForTests } from "@/lib/forms/rate-limit";
import { PATCH, DELETE } from "./route";

const readCartSessionTokenMock = vi.fn();
const updateLineQuantityMock = vi.fn();
const removeLineMock = vi.fn();
const getCartViewMock = vi.fn();

vi.mock("@/lib/cart-session", () => ({
  readCartSessionToken: () => readCartSessionTokenMock(),
}));

vi.mock("@/services/cart-service", () => ({
  updateLineQuantity: (token: string, lineId: string, quantity: number) =>
    updateLineQuantityMock(token, lineId, quantity),
  removeLine: (token: string, lineId: string) => removeLineMock(token, lineId),
  getCartView: (token: string, locale: string) =>
    getCartViewMock(token, locale),
}));

function makeRequest(
  method: string,
  body: unknown,
  headers: Record<string, string> = {},
) {
  return new NextRequest("http://localhost:3000/api/cart/lines/line-1", {
    method,
    headers: {
      host: "localhost:3000",
      "content-type": "application/json",
      ...headers,
    },
    body: body !== undefined ? JSON.stringify(body) : undefined,
  });
}

const params = Promise.resolve({ lineId: "line-1" });

/**
 * Phase J hardening — `PATCH`/`DELETE /api/cart/lines/[lineId]` had no
 * CSRF/rate-limit guard at all, matching the gap fixed on the sibling
 * `/api/cart` and `/api/cart/lines` routes.
 */
describe("PATCH /api/cart/lines/[lineId]", () => {
  beforeEach(() => {
    __resetRateLimitForTests();
    readCartSessionTokenMock.mockReset().mockResolvedValue("token-1");
    updateLineQuantityMock.mockReset().mockResolvedValue({ status: "ok" });
    getCartViewMock
      .mockReset()
      .mockResolvedValue({ lines: [], currency: "UAH", count: 0, subtotal: 0 });
  });

  it("updates the line quantity for a real same-origin request", async () => {
    const response = await PATCH(makeRequest("PATCH", { quantity: 2 }), {
      params,
    });
    const json = await response.json();
    expect(json.ok).toBe(true);
    expect(updateLineQuantityMock).toHaveBeenCalledWith("token-1", "line-1", 2);
  });

  it("rejects a cross-origin request without touching the cart", async () => {
    const response = await PATCH(
      makeRequest("PATCH", { quantity: 2 }, { origin: "https://evil.example" }),
      {
        params,
      },
    );
    expect(response.status).toBe(403);
    expect(updateLineQuantityMock).not.toHaveBeenCalled();
  });

  it("rate-limits repeated requests from the same client", async () => {
    for (let i = 0; i < 5; i++)
      await PATCH(makeRequest("PATCH", { quantity: 2 }), { params });
    const response = await PATCH(makeRequest("PATCH", { quantity: 2 }), {
      params,
    });
    expect(response.status).toBe(429);
  });
});

describe("DELETE /api/cart/lines/[lineId]", () => {
  beforeEach(() => {
    __resetRateLimitForTests();
    readCartSessionTokenMock.mockReset().mockResolvedValue("token-1");
    removeLineMock.mockReset().mockResolvedValue({ status: "ok" });
    getCartViewMock
      .mockReset()
      .mockResolvedValue({ lines: [], currency: "UAH", count: 0, subtotal: 0 });
  });

  it("removes the line for a real same-origin request", async () => {
    const response = await DELETE(makeRequest("DELETE", undefined), { params });
    const json = await response.json();
    expect(json.ok).toBe(true);
    expect(removeLineMock).toHaveBeenCalledWith("token-1", "line-1");
  });

  it("rejects a cross-origin request without touching the cart", async () => {
    const response = await DELETE(
      makeRequest("DELETE", undefined, { origin: "https://evil.example" }),
      { params },
    );
    expect(response.status).toBe(403);
    expect(removeLineMock).not.toHaveBeenCalled();
  });

  it("rate-limits repeated requests from the same client", async () => {
    for (let i = 0; i < 5; i++)
      await DELETE(makeRequest("DELETE", undefined), { params });
    const response = await DELETE(makeRequest("DELETE", undefined), { params });
    expect(response.status).toBe(429);
  });
});
