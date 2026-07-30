import { describe, expect, it, beforeEach, afterEach } from "vitest";
import crypto from "node:crypto";
import { OrderId, PaymentId } from "@/domain/shared/ids";
import type { Order } from "@/domain/ecommerce/order";
import {
  isLiqPayConfigured,
  buildLiqPayCheckoutPayload,
  verifyLiqPaySignature,
  decodeLiqPayCallbackData,
  mapLiqPayStatus,
} from "./liqpay-adapter";

/** Pure-function tests for LiqPay's real signing scheme (Prompt 8 §9, Phase F) — no network, no Payload. */
const ORIGINAL_ENV = { ...process.env };

beforeEach(() => {
  delete process.env.LIQPAY_PUBLIC_KEY;
  delete process.env.LIQPAY_PRIVATE_KEY;
});

afterEach(() => {
  process.env = { ...ORIGINAL_ENV };
});

const order: Order = {
  id: OrderId.parse("order-1"),
  orderNumber: "SO-20260729-ABC123",
  lines: [],
  subtotal: { currency: "UAH", minorUnits: 100000 },
  discountTotal: { currency: "UAH", minorUnits: 0 },
  deliveryTotal: { currency: "UAH", minorUnits: 0 },
  total: { currency: "UAH", minorUnits: 100000 },
  deliveryMethod: { type: "pickup", stockistId: "stockist-1" as never },
  customer: { fullName: "Іван Іванов", phone: "+380501234567" },
  status: "awaitingPayment",
  paymentId: PaymentId.parse("payment-1"),
  createdAt: new Date().toISOString(),
  updatedAt: new Date().toISOString(),
};

describe("isLiqPayConfigured", () => {
  it("is false when either env var is missing", () => {
    expect(isLiqPayConfigured()).toBe(false);
    process.env.LIQPAY_PUBLIC_KEY = "pk";
    expect(isLiqPayConfigured()).toBe(false);
  });

  it("is true when both env vars are set", () => {
    process.env.LIQPAY_PUBLIC_KEY = "pk";
    process.env.LIQPAY_PRIVATE_KEY = "sk";
    expect(isLiqPayConfigured()).toBe(true);
  });
});

describe("buildLiqPayCheckoutPayload", () => {
  it("returns null when not configured, so the order service can fall back to manual", () => {
    const payload = buildLiqPayCheckoutPayload(
      order,
      "https://example.com/uk/order-status",
      "https://example.com/api/checkout/liqpay-callback",
    );
    expect(payload).toBeNull();
  });

  it("builds a data/signature pair matching LiqPay's own scheme when configured", () => {
    process.env.LIQPAY_PUBLIC_KEY = "pk_test";
    process.env.LIQPAY_PRIVATE_KEY = "sk_test";
    const payload = buildLiqPayCheckoutPayload(
      order,
      "https://example.com/uk/order-status",
      "https://example.com/api/checkout/liqpay-callback",
    );
    expect(payload).not.toBeNull();
    if (!payload) throw new Error("unreachable");

    expect(payload.checkoutUrl).toBe("https://www.liqpay.ua/api/3/checkout");

    const decoded = JSON.parse(
      Buffer.from(payload.data, "base64").toString("utf8"),
    );
    expect(decoded).toMatchObject({
      version: 3,
      public_key: "pk_test",
      action: "pay",
      amount: 1000,
      currency: "UAH",
      order_id: "SO-20260729-ABC123",
      result_url: "https://example.com/uk/order-status",
      server_url: "https://example.com/api/checkout/liqpay-callback",
    });

    const expectedSignature = crypto
      .createHash("sha1")
      .update("sk_test" + payload.data + "sk_test")
      .digest("base64");
    expect(payload.signature).toBe(expectedSignature);
  });

  it("never leaks a card number/CVV field — this app never collects card data itself", () => {
    process.env.LIQPAY_PUBLIC_KEY = "pk_test";
    process.env.LIQPAY_PRIVATE_KEY = "sk_test";
    const payload = buildLiqPayCheckoutPayload(
      order,
      "https://example.com/uk/order-status",
      "https://example.com/api/checkout/liqpay-callback",
    );
    if (!payload) throw new Error("unreachable");
    const decoded = JSON.parse(
      Buffer.from(payload.data, "base64").toString("utf8"),
    );
    expect(decoded).not.toHaveProperty("card");
    expect(decoded).not.toHaveProperty("cvv");
  });
});

describe("verifyLiqPaySignature", () => {
  it("returns false when LIQPAY_PRIVATE_KEY isn't configured, so no callback is ever trusted without it", () => {
    expect(verifyLiqPaySignature("anything", "anything")).toBe(false);
  });

  it("accepts a signature computed with the real scheme", () => {
    process.env.LIQPAY_PRIVATE_KEY = "sk_test";
    const data = Buffer.from(JSON.stringify({ order_id: "SO-1" })).toString(
      "base64",
    );
    const signature = crypto
      .createHash("sha1")
      .update("sk_test" + data + "sk_test")
      .digest("base64");
    expect(verifyLiqPaySignature(data, signature)).toBe(true);
  });

  it("rejects a tampered signature", () => {
    process.env.LIQPAY_PRIVATE_KEY = "sk_test";
    const data = Buffer.from(JSON.stringify({ order_id: "SO-1" })).toString(
      "base64",
    );
    expect(verifyLiqPaySignature(data, "not-the-right-signature")).toBe(false);
  });

  it("rejects a signature computed with the wrong private key", () => {
    process.env.LIQPAY_PRIVATE_KEY = "sk_test";
    const data = Buffer.from(JSON.stringify({ order_id: "SO-1" })).toString(
      "base64",
    );
    const wrongSignature = crypto
      .createHash("sha1")
      .update("other-key" + data + "other-key")
      .digest("base64");
    expect(verifyLiqPaySignature(data, wrongSignature)).toBe(false);
  });
});

describe("decodeLiqPayCallbackData", () => {
  it("round-trips a base64 JSON payload", () => {
    const data = Buffer.from(
      JSON.stringify({ order_id: "SO-1", status: "success" }),
    ).toString("base64");
    expect(decodeLiqPayCallbackData(data)).toEqual({
      order_id: "SO-1",
      status: "success",
    });
  });
});

describe("mapLiqPayStatus", () => {
  it("maps final statuses", () => {
    expect(mapLiqPayStatus("success")).toBe("success");
    expect(mapLiqPayStatus("sandbox")).toBe("sandbox");
    expect(mapLiqPayStatus("reversed")).toBe("reversed");
    expect(mapLiqPayStatus("failure")).toBe("failure");
    expect(mapLiqPayStatus("error")).toBe("failure");
  });

  it("returns null for non-final/unknown statuses, leaving the order/payment untouched", () => {
    expect(mapLiqPayStatus("processing")).toBeNull();
    expect(mapLiqPayStatus("wait_secure")).toBeNull();
    expect(mapLiqPayStatus(undefined)).toBeNull();
    expect(mapLiqPayStatus(123)).toBeNull();
  });
});
