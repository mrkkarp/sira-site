import { describe, expect, it, vi, beforeEach, afterEach } from "vitest";
import crypto from "node:crypto";
import { NextRequest } from "next/server";
import type { Order } from "@/domain/ecommerce/order";
import type { Payment } from "@/domain/ecommerce/payment";

/**
 * The LiqPay server-to-server callback — the only place in the app that
 * decides an order was paid for. Everything here is about a *state
 * transition backed by money*, so the cases that matter are the ones where
 * the callback and the order disagree:
 *
 *  - the amount doesn't match the order's frozen total (partial payment,
 *    wrong currency, a callback replayed against a different order),
 *  - a refund arrives for a payment already recorded as successful,
 *  - a LiqPay *sandbox* (test, no money moved) callback lands on the real
 *    production deploy.
 *
 * Each of those used to end with the order marked `paid`, or — for the
 * refund — silently ignored.
 */

const PRIVATE_KEY = "test-private-key";

const order = {
  id: "order-1",
  orderNumber: "OD-20260801-0001",
  total: { currency: "UAH", minorUnits: 2090000 },
  status: "awaitingPayment",
} as unknown as Order;

const payment = {
  id: "payment-1",
  orderId: "order-1",
  provider: "liqpay",
  status: "pending",
  amount: { currency: "UAH", minorUnits: 2090000 },
} as unknown as Payment;

const orderRepo = vi.hoisted(() => ({
  findByOrderNumber: vi.fn(),
  updateStatus: vi.fn(),
}));
const paymentRepo = vi.hoisted(() => ({
  findByOrderId: vi.fn(),
  updateStatus: vi.fn(),
}));

vi.mock("@/repositories/order-repository", () => ({
  getOrderRepository: async () => orderRepo,
}));
vi.mock("@/repositories/payment-repository", () => ({
  getPaymentRepository: async () => paymentRepo,
}));

const { POST } = await import("./route");

/** Builds a genuinely-signed callback, so these tests exercise the real signature check rather than stubbing past it. */
function callbackRequest(payload: Record<string, unknown>) {
  const data = Buffer.from(JSON.stringify(payload)).toString("base64");
  const signature = crypto
    .createHash("sha1")
    .update(PRIVATE_KEY + data + PRIVATE_KEY)
    .digest("base64");
  const form = new URLSearchParams({ data, signature });
  return new NextRequest("http://localhost:3000/api/checkout/liqpay-callback", {
    method: "POST",
    headers: { "content-type": "application/x-www-form-urlencoded" },
    body: form.toString(),
  });
}

/** A callback that pays exactly the order's total, unless overridden. */
function paidPayload(overrides: Record<string, unknown> = {}) {
  return {
    status: "success",
    order_id: order.orderNumber,
    payment_id: 987654,
    amount: 20900.0,
    currency: "UAH",
    ...overrides,
  };
}

describe("POST /api/checkout/liqpay-callback", () => {
  const originalEnv = { ...process.env };

  beforeEach(() => {
    vi.restoreAllMocks();
    vi.clearAllMocks();
    process.env = { ...originalEnv };
    process.env.LIQPAY_PRIVATE_KEY = PRIVATE_KEY;
    delete process.env.VERCEL_ENV;
    orderRepo.findByOrderNumber.mockResolvedValue(order);
    orderRepo.updateStatus.mockResolvedValue(order);
    paymentRepo.findByOrderId.mockResolvedValue([payment]);
    paymentRepo.updateStatus.mockResolvedValue(payment);
  });

  afterEach(() => {
    process.env = { ...originalEnv };
  });

  it("rejects a callback whose signature doesn't verify", async () => {
    const data = Buffer.from(JSON.stringify(paidPayload())).toString("base64");
    const request = new NextRequest(
      "http://localhost:3000/api/checkout/liqpay-callback",
      {
        method: "POST",
        headers: { "content-type": "application/x-www-form-urlencoded" },
        body: new URLSearchParams({ data, signature: "forged" }).toString(),
      },
    );

    const response = await POST(request);

    expect(response.status).toBe(400);
    expect(await response.json()).toEqual({
      ok: false,
      error: "invalid_signature",
    });
    // Nothing may be read or written on an unverified callback.
    expect(orderRepo.findByOrderNumber).not.toHaveBeenCalled();
    expect(orderRepo.updateStatus).not.toHaveBeenCalled();
  });

  it("marks the order paid when a verified success callback matches the total", async () => {
    const response = await POST(callbackRequest(paidPayload()));

    expect(await response.json()).toEqual({ ok: true, outcome: "processed" });
    expect(paymentRepo.updateStatus).toHaveBeenCalledWith(
      payment.id,
      "success",
      expect.objectContaining({
        signatureVerified: true,
        externalId: "987654",
      }),
    );
    expect(orderRepo.updateStatus).toHaveBeenCalledWith(order.id, "paid");
  });

  it("refuses to mark an order paid when the amount is short", async () => {
    // 1.00 UAH against a 20 900.00 UAH order. The signature is valid — this
    // is not forgery, it's a mismatch — so only the amount check stops it.
    const response = await POST(callbackRequest(paidPayload({ amount: 1.0 })));

    expect(await response.json()).toEqual({
      ok: true,
      outcome: "amount_mismatch",
    });
    expect(orderRepo.updateStatus).not.toHaveBeenCalled();
    // The payload is still recorded against the payment, at its *existing*
    // status, so staff can reconcile what LiqPay actually said.
    expect(paymentRepo.updateStatus).toHaveBeenCalledWith(
      payment.id,
      payment.status,
      expect.objectContaining({ signatureVerified: true }),
    );
  });

  it("refuses to mark an order paid when the currency differs", async () => {
    const response = await POST(
      callbackRequest(paidPayload({ currency: "USD" })),
    );

    expect(await response.json()).toEqual({
      ok: true,
      outcome: "amount_mismatch",
    });
    expect(orderRepo.updateStatus).not.toHaveBeenCalled();
  });

  it("records a refund for an already-successful payment instead of swallowing it", async () => {
    // The regression this guards: a `reversed` callback carries the *same*
    // payment_id as the original payment, so an idempotency guard keyed on
    // "this externalId is already success" would return `already_processed`
    // and the order would stay `paid` — money refunded, nothing recorded.
    paymentRepo.findByOrderId.mockResolvedValue([
      { ...payment, status: "success", externalId: "987654" },
    ]);

    const response = await POST(
      callbackRequest(paidPayload({ status: "reversed" })),
    );

    expect(await response.json()).toEqual({ ok: true, outcome: "processed" });
    expect(paymentRepo.updateStatus).toHaveBeenCalledWith(
      payment.id,
      "reversed",
      expect.anything(),
    );
    expect(orderRepo.updateStatus).toHaveBeenCalledWith(order.id, "refunded");
  });

  it("treats a genuine repeat of the same callback as a no-op", async () => {
    // Same externalId *and* same status — LiqPay retrying a webhook it
    // already delivered. This must not transition anything a second time.
    paymentRepo.findByOrderId.mockResolvedValue([
      { ...payment, status: "success", externalId: "987654" },
    ]);

    const response = await POST(callbackRequest(paidPayload()));

    expect(await response.json()).toEqual({
      ok: true,
      outcome: "already_processed",
    });
    expect(paymentRepo.updateStatus).not.toHaveBeenCalled();
    expect(orderRepo.updateStatus).not.toHaveBeenCalled();
  });

  it("does not mark an order paid on a sandbox callback in production", async () => {
    // A sandbox transaction moves no real money. Accepting it on the
    // production deploy would ship goods against a test payment.
    process.env.VERCEL_ENV = "production";

    const response = await POST(
      callbackRequest(paidPayload({ status: "sandbox" })),
    );

    expect(await response.json()).toEqual({ ok: true, outcome: "processed" });
    expect(paymentRepo.updateStatus).toHaveBeenCalledWith(
      payment.id,
      "sandbox",
      expect.anything(),
    );
    expect(orderRepo.updateStatus).not.toHaveBeenCalled();
  });

  it("accepts a sandbox callback outside production, so checkout can be exercised end-to-end", async () => {
    process.env.VERCEL_ENV = "preview";

    await POST(callbackRequest(paidPayload({ status: "sandbox" })));

    expect(orderRepo.updateStatus).toHaveBeenCalledWith(order.id, "paid");
  });

  it("marks the order failed on a failure callback", async () => {
    await POST(callbackRequest(paidPayload({ status: "failure" })));

    expect(orderRepo.updateStatus).toHaveBeenCalledWith(order.id, "failed");
  });

  it("records a non-final status without transitioning anything", async () => {
    const response = await POST(
      callbackRequest(paidPayload({ status: "wait_secure" })),
    );

    expect(await response.json()).toEqual({ ok: true, outcome: "recorded" });
    expect(paymentRepo.updateStatus).toHaveBeenCalledWith(
      payment.id,
      payment.status,
      expect.anything(),
    );
    expect(orderRepo.updateStatus).not.toHaveBeenCalled();
  });

  it("404s for an order number that doesn't exist", async () => {
    orderRepo.findByOrderNumber.mockResolvedValue(null);

    const response = await POST(callbackRequest(paidPayload()));

    expect(response.status).toBe(404);
    expect(orderRepo.updateStatus).not.toHaveBeenCalled();
  });
});
