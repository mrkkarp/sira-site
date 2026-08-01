import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { getOrderRepository } from "@/repositories/order-repository";
import { getPaymentRepository } from "@/repositories/payment-repository";
import {
  verifyLiqPaySignature,
  decodeLiqPayCallbackData,
  mapLiqPayStatus,
} from "@/lib/payments/liqpay-adapter";
import {
  moneyToDecimal,
  MINOR_UNITS_PER_CURRENCY,
} from "@/domain/shared/money";
import type { Order } from "@/domain/ecommerce/order";

type MappedStatus = NonNullable<ReturnType<typeof mapLiqPayStatus>>;

/**
 * Whether a mapped LiqPay status means money actually arrived.
 *
 * `sandbox` is LiqPay's *test* transaction status — no money moves. It
 * counts as paid only outside production, where it's the normal way to
 * exercise checkout end-to-end. On the real production deploy a sandbox
 * callback must never mark an order paid: that would ship real goods
 * against a test payment.
 */
function isPaidStatus(status: MappedStatus): boolean {
  if (status === "success") return true;
  return status === "sandbox" && process.env.VERCEL_ENV !== "production";
}

/**
 * Compares what LiqPay says was paid against the order's own frozen total.
 *
 * LiqPay reports `amount` as a decimal (`20900.00`) while the domain stores
 * integer minor units, so this converts the order's total *down* to decimal
 * and back to cents rather than re-deriving any total from the lines.
 */
function callbackMatchesOrderTotal(
  payload: Record<string, unknown>,
  order: Order,
): boolean {
  const amount = Number(payload.amount);
  if (!Number.isFinite(amount)) return false;
  if (payload.currency !== order.total.currency) return false;
  const factor = MINOR_UNITS_PER_CURRENCY[order.total.currency];
  // Rounded, because `20900.00 * 100` is not exactly 2090000 in binary floating point.
  return Math.round(amount * factor) === order.total.minorUnits;
}

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
  //
  // The comparison is against `mappedStatus`, not a hard-coded "success":
  // a refund/chargeback arrives as a `reversed` callback carrying the
  // *same* `payment_id` as the original payment, so a guard keyed only on
  // "this externalId is already success" would short-circuit it and the
  // order would stay `paid` forever — money returned to the customer and
  // nothing in the system saying so.
  if (
    externalId &&
    payment.externalId === externalId &&
    mappedStatus !== null &&
    payment.status === mappedStatus
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

  // Only a callback that actually paid the order's own total may mark it
  // paid. The signature already proves LiqPay sent this, so the threat
  // isn't forgery — it's a *mismatch*: a partial payment, a payment in
  // another currency, or a callback replayed against a different order
  // would otherwise flip the order to `paid` for the wrong sum and the
  // goods would ship. On mismatch the payload is still recorded (so staff
  // can reconcile) but no state transition happens.
  if (
    isPaidStatus(mappedStatus) &&
    !callbackMatchesOrderTotal(payload, order)
  ) {
    await paymentRepository.updateStatus(payment.id, payment.status, {
      signatureVerified: true,
      externalId,
      rawCallbackPayload,
    });
    console.error(
      "[liqpay-callback]",
      JSON.stringify({
        outcome: "amount_mismatch",
        orderNumber,
        expected: {
          amount: moneyToDecimal(order.total),
          currency: order.total.currency,
        },
        received: { amount: payload.amount, currency: payload.currency },
      }),
    );
    return NextResponse.json({ ok: true, outcome: "amount_mismatch" });
  }

  await paymentRepository.updateStatus(payment.id, mappedStatus, {
    signatureVerified: true,
    externalId,
    rawCallbackPayload,
  });

  if (isPaidStatus(mappedStatus)) {
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
