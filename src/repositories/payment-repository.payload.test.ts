import { describe, expect, it } from "vitest";
import { mapPayloadPaymentToDomain } from "./payment-repository.payload";
import type { Payment as PayloadPayment } from "@/payload-types";

const doc: PayloadPayment = {
  id: 7,
  orderId: 100,
  provider: "liqpay",
  amount: { currency: "UAH", minorUnits: 460000 },
  status: "success",
  externalId: "liqpay-txn-123",
  signatureVerified: true,
  rawCallbackPayload: "{}",
  updatedAt: "2026-01-01T00:00:00.000Z",
  createdAt: "2026-01-01T00:00:00.000Z",
};

describe("mapPayloadPaymentToDomain", () => {
  it("maps a fully-populated successful LiqPay payment", () => {
    const payment = mapPayloadPaymentToDomain(doc);
    expect(payment.id).toBe("7");
    expect(payment.orderId).toBe("100");
    expect(payment.provider).toBe("liqpay");
    expect(payment.amount).toEqual({ currency: "UAH", minorUnits: 460000 });
    expect(payment.status).toBe("success");
    expect(payment.externalId).toBe("liqpay-txn-123");
    expect(payment.signatureVerified).toBe(true);
  });

  it("defaults signatureVerified to false and leaves externalId unset for a fresh pending payment", () => {
    const payment = mapPayloadPaymentToDomain({
      ...doc,
      status: "pending",
      externalId: null,
      signatureVerified: null,
      rawCallbackPayload: null,
    });
    expect(payment.status).toBe("pending");
    expect(payment.externalId).toBeUndefined();
    expect(payment.signatureVerified).toBe(false);
    expect(payment.rawCallbackPayload).toBeUndefined();
  });
});
