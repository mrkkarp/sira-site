import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { getOrderRepository } from "@/repositories/order-repository";
import { getPaymentRepository } from "@/repositories/payment-repository";
import {
  verifyLiqPaySignature,
  decodeLiqPayCallbackData,
  mapLiqPayStatus,
} from "@/lib/payments/liqpay-adapter";

/**
 * LiqPay's server-to-server payment callback (Prompt 8 §9/§13, Phase F).
 * This is the *only* place a `Payment`/`Order` is ever marked `success`/
 * `paid` — never the customer's browser redirect back to `result_url`
 * (see `OrderStatus`'s doc comment), and never anything the frontend
 * reports. Deliberately doesn't apply `isSameOriginRequest()`/rate-
 * limiting like the Phase E forms API: this is called by LiqPay's own
 * servers, not a browser, so an `Origin`/`Host` match is meaningless —
 * the cryptographic signature is what makes this callback trustworthy.
 *
 * LiqPay POSTs `data`/`signature` as `application/x-www-form-urlencoded`
 * fields, not JSON.
 */
export async function POST(request: NextRequest) {
  let data: string | null = null;
  let signature: string | null = null;
  try {
    const form = await request.formData();
    data = form.get("data") as string | null;
    signature = form.get("signature") as string | null;
  } catch {
    return NextResponse.json(
      { ok: false, error: "invalid_body" },
      { status: 400 },
    );
  }

  if (!data || !signature || !verifyLiqPaySignature(data, signature)) {
    console.warn("[liqpay-callback] rejected: missing or invalid signature");
    return NextResponse.json(
      { ok: false, error: "invalid_signature" },
      { status: 400 },
    );
  }

  const payload = decodeLiqPayCallbackData(data);
  const orderNumber =
    typeof payload.order_id === "string" ? payload.order_id : undefined;
  const externalId =
    payload.payment_id != null ? String(payload.payment_id) : undefined;
  const mappedStatus = mapLiqPayStatus(payload.status);

  if (!orderNumber) {
    console.warn(
      "[liqpay-callback] rejected: callback payload has no order_id",
    );
    return NextResponse.json(
      { ok: false, error: "missing_order_id" },
      { status: 400 },
    );
  }

  const orderRepository = await getOrderRepository();
  const order = await orderRepository.findByOrderNumber(orderNumber);
  if (!order) {
    console.warn(
      "[liqpay-callback]",
      JSON.stringify({ outcome: "order_not_found", orderNumber }),
    );
    return NextResponse.json(
      { ok: false, error: "order_not_found" },
      { status: 404 },
    );
  }

  const paymentRepository = await getPaymentRepository();
  const payments = await paymentRepository.findByOrderId(order.id);
  const payment =
    payments.find((candidate) => candidate.provider === "liqpay") ??
    payments[0];
  if (!payment) {
    console.warn(
      "[liqpay-callback]",
      JSON.stringify({ outcome: "payment_not_found", orderNumber }),
    );
    return NextResponse.json(
      { ok: false, error: "payment_not_found" },
      { status: 404 },
    );
  }

  // Idempotency (§9/§13): a repeat callback for an already-processed
  // `externalId` (LiqPay retries webhooks) must be a no-op, never a
  // second state transition.
  if (
    externalId &&
    payment.externalId === externalId &&
    payment.status === "success"
  ) {
    return NextResponse.json({ ok: true, outcome: "already_processed" });
  }

  const rawCallbackPayload = JSON.stringify(payload);

  if (!mappedStatus) {
    // A non-final LiqPay status (e.g. "processing", "wait_secure") —
    // record the raw payload for audit but don't transition anything.
    await paymentRepository.updateStatus(payment.id, payment.status, {
      signatureVerified: true,
      externalId,
      rawCallbackPayload,
    });
    return NextResponse.json({ ok: true, outcome: "recorded" });
  }

  await paymentRepository.updateStatus(payment.id, mappedStatus, {
    signatureVerified: true,
    externalId,
    rawCallbackPayload,
  });

  if (mappedStatus === "success" || mappedStatus === "sandbox") {
    await orderRepository.updateStatus(order.id, "paid");
  } else if (mappedStatus === "failure") {
    await orderRepository.updateStatus(order.id, "failed");
  } else if (mappedStatus === "reversed") {
    await orderRepository.updateStatus(order.id, "refunded");
  }

  console.info(
    "[liqpay-callback]",
    JSON.stringify({ outcome: "processed", orderNumber, status: mappedStatus }),
  );
  return NextResponse.json({ ok: true, outcome: "processed" });
}
