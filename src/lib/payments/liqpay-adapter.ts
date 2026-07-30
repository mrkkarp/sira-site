import "server-only";
import crypto from "node:crypto";
import { moneyToDecimal } from "@/domain/shared/money";
import type { Order } from "@/domain/ecommerce/order";

/**
 * LiqPay adapter (Prompt 8 §2.3/§9, Phase F). Implements LiqPay's real
 * "Checkout" signing scheme directly (no SDK dependency needed for two
 * endpoints): a base64-encoded JSON `data` payload, signed as
 * `base64(sha1(private_key + data + private_key))`. The customer is
 * redirected (via an auto-submitting form, since LiqPay's checkout is a
 * POST endpoint) to LiqPay's own hosted page — this app never collects
 * a card number/CVV itself, matching the spec's explicit prohibition on
 * building custom card-payment acceptance.
 *
 * Gated on `LIQPAY_PUBLIC_KEY`/`LIQPAY_PRIVATE_KEY` (`.env.example`):
 * when either is missing, `buildLiqPayCheckoutPayload`/
 * `isLiqPayConfigured` report "not configured" rather than throwing, so
 * the order service can fall back to the `"manual"` (invoice/COD-style)
 * provider — same env-var-gated-fallback shape as
 * `lead-notification-adapter.ts`'s Resend/console split.
 */
export function isLiqPayConfigured(): boolean {
  return Boolean(
    process.env.LIQPAY_PUBLIC_KEY && process.env.LIQPAY_PRIVATE_KEY,
  );
}

function sign(data: string, privateKey: string): string {
  return crypto
    .createHash("sha1")
    .update(privateKey + data + privateKey)
    .digest("base64");
}

export interface LiqPayCheckoutPayload {
  data: string;
  signature: string;
  checkoutUrl: string;
}

/**
 * Builds the `data`/`signature` pair for LiqPay's `checkout` action.
 * `resultUrl` is where LiqPay redirects the customer's browser back to
 * after paying (a public page, e.g. `/order-status`); `serverUrl` is
 * the server-to-server callback LiqPay calls to actually report the
 * payment outcome (`/api/checkout/liqpay-callback`) — only that
 * signature-verified callback is ever allowed to mark a `Payment`/
 * `Order` as paid, never the customer's redirect back to `resultUrl`.
 */
export function buildLiqPayCheckoutPayload(
  order: Order,
  resultUrl: string,
  serverUrl: string,
): LiqPayCheckoutPayload | null {
  const publicKey = process.env.LIQPAY_PUBLIC_KEY;
  const privateKey = process.env.LIQPAY_PRIVATE_KEY;
  if (!publicKey || !privateKey) return null;

  const payload = {
    version: 3,
    public_key: publicKey,
    action: "pay",
    amount: moneyToDecimal(order.total),
    currency: order.total.currency,
    description: `Замовлення ${order.orderNumber}`,
    order_id: order.orderNumber,
    result_url: resultUrl,
    server_url: serverUrl,
  };
  const data = Buffer.from(JSON.stringify(payload)).toString("base64");
  return {
    data,
    signature: sign(data, privateKey),
    checkoutUrl: "https://www.liqpay.ua/api/3/checkout",
  };
}

/** Verifies a callback's `signature` against its `data` — the one thing that makes the LiqPay callback handler trustworthy (Prompt 8 §9/§13). Returns `false` (never throws) if `LIQPAY_PRIVATE_KEY` isn't configured, since no callback should ever be trusted in that case. */
export function verifyLiqPaySignature(
  data: string,
  signature: string,
): boolean {
  const privateKey = process.env.LIQPAY_PRIVATE_KEY;
  if (!privateKey) return false;
  // Constant-time comparison — signatures are attacker-controlled input.
  const expected = Buffer.from(sign(data, privateKey));
  const actual = Buffer.from(signature);
  return (
    expected.length === actual.length &&
    crypto.timingSafeEqual(expected, actual)
  );
}

/** LiqPay's callback body carries one field, `data` (base64 JSON) — this decodes it after the signature has already been verified by the caller. */
export function decodeLiqPayCallbackData(
  data: string,
): Record<string, unknown> {
  return JSON.parse(Buffer.from(data, "base64").toString("utf8"));
}

/**
 * LiqPay's own `status` values map to a much larger set of intermediate
 * states than this app's `PaymentStatus` needs to track (Prompt 8 §9).
 * Returns `null` for a non-final/in-progress status (e.g. `processing`,
 * `wait_secure`) — the callback handler leaves the order/payment status
 * untouched in that case rather than guessing a transition.
 */
export function mapLiqPayStatus(
  rawStatus: unknown,
): "success" | "failure" | "reversed" | "sandbox" | null {
  switch (rawStatus) {
    case "success":
      return "success";
    case "sandbox":
      return "sandbox";
    case "reversed":
      return "reversed";
    case "failure":
    case "error":
      return "failure";
    default:
      return null;
  }
}
