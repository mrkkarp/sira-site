import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { isLocale, defaultLocale } from "@/i18n/config";
import { readCartSessionToken } from "@/lib/cart-session";
import { placeOrder } from "@/services/order-service";
import { CheckoutRequestSchema } from "@/lib/schemas/checkout-request";
import { isHoneypotTripped } from "@/lib/forms/honeypot";
import { isRateLimited, clientKeyFromRequest } from "@/lib/forms/rate-limit";
import { isSameOriginRequest } from "@/lib/forms/verify-same-origin";
import { getOrderNotificationAdapter } from "@/lib/email/order-notification-adapter";
import {
  buildLiqPayCheckoutPayload,
  type LiqPayCheckoutPayload,
} from "@/lib/payments/liqpay-adapter";

export type CheckoutResponse =
  | {
      ok: true;
      orderNumber: string;
      status: string;
      provider: "liqpay" | "manual";
      liqpay?: LiqPayCheckoutPayload;
    }
  | {
      ok: false;
      error:
        | "invalid_input"
        | "rate_limited"
        | "cart_empty"
        | "line_unavailable"
        | "server_error";
      detail?: string;
    };

function localeFromRequest(request: NextRequest) {
  const raw = request.nextUrl.searchParams.get("locale") ?? defaultLocale;
  return isLocale(raw) ? raw : defaultLocale;
}

/**
 * Places a real order from the live, server-persisted cart (Phase F).
 * Applies the same public-endpoint hardening as the Phase E forms API
 * (same-origin check, rate-limiting, honeypot, generic-vs-dev-detail
 * errors) — a checkout submission is exactly the kind of endpoint that
 * needs it, arguably more so than a contact form.
 *
 * Never trusts a price/redirect claim from the client: `placeOrder()`
 * re-validates every cart line server-side, and the only payment
 * outcome this route can ever report is "here is where to go to pay"
 * (LiqPay's hosted checkout) or "an invoice will follow" (manual) —
 * it never marks anything as paid itself. That only ever happens in
 * the signature-verified `/api/checkout/liqpay-callback` handler.
 */
export async function POST(request: NextRequest) {
  if (!isSameOriginRequest(request)) {
    return NextResponse.json(
      { ok: false, error: "invalid_input" } satisfies CheckoutResponse,
      { status: 403 },
    );
  }

  if (isRateLimited(`checkout:${clientKeyFromRequest(request)}`)) {
    return NextResponse.json(
      { ok: false, error: "rate_limited" } satisfies CheckoutResponse,
      { status: 429 },
    );
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json(
      { ok: false, error: "invalid_input" } satisfies CheckoutResponse,
      { status: 400 },
    );
  }

  if (
    typeof body === "object" &&
    body !== null &&
    isHoneypotTripped(body as Record<string, unknown>)
  ) {
    // Pretends to succeed, same convention as the forms API — never
    // hands a bot a signal that its submission was distinguished from
    // a real one. There is no real order to report, so a bare
    // placeholder response is the honest option here.
    //
    // Logged as a warning because, unlike a contact form, a false positive
    // here costs a whole order: if an extension/password manager ever
    // autofills the hidden field for real customers, this line is the only
    // way to find out. The client refuses to render a confirmation for an
    // empty order number, so such a customer sees an error and can retry.
    console.warn(
      "[checkout] honeypot tripped — no order was created for this submission",
    );
    return NextResponse.json({
      ok: true,
      orderNumber: "",
      status: "pending",
      provider: "manual",
    } satisfies CheckoutResponse);
  }

  const parsed = CheckoutRequestSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      {
        ok: false,
        error: "invalid_input",
        detail:
          process.env.NODE_ENV === "development"
            ? parsed.error.message
            : undefined,
      } satisfies CheckoutResponse,
      { status: 400 },
    );
  }

  const token = await readCartSessionToken();
  if (!token) {
    return NextResponse.json(
      { ok: false, error: "cart_empty" } satisfies CheckoutResponse,
      { status: 422 },
    );
  }

  try {
    const result = await placeOrder(token, {
      customer: parsed.data.customer,
      deliveryMethod: parsed.data.deliveryMethod,
      notes: parsed.data.notes,
    });

    if (result.status === "cartEmpty") {
      return NextResponse.json(
        { ok: false, error: "cart_empty" } satisfies CheckoutResponse,
        { status: 422 },
      );
    }
    if (result.status === "lineUnavailable") {
      return NextResponse.json(
        {
          ok: false,
          error: "line_unavailable",
          detail: result.sku,
        } satisfies CheckoutResponse,
        { status: 422 },
      );
    }

    const { order, payment } = result;

    // Tell staff an order exists. Deliberately awaited (so a serverless
    // instance can't be frozen before the request goes out) but never allowed
    // to fail the response: the order is already committed to Postgres at this
    // point, so turning a notification failure into a 500 would show the
    // customer an error for an order that really was placed — and they'd
    // re-submit it. A failure here is logged and left for the admin panel,
    // which remains the source of truth.
    try {
      await getOrderNotificationAdapter().notifyNewOrder(order);
    } catch (notificationError) {
      console.error(
        `[checkout] order ${order.orderNumber} was placed but the staff notification failed`,
        notificationError,
      );
    }

    const locale = localeFromRequest(request);
    const serverBase =
      process.env.NEXT_PUBLIC_SERVER_URL ?? request.nextUrl.origin;

    const liqpay =
      payment.provider === "liqpay"
        ? (buildLiqPayCheckoutPayload(
            order,
            `${serverBase}/${locale}/order-status`,
            `${serverBase}/api/checkout/liqpay-callback`,
          ) ?? undefined)
        : undefined;

    return NextResponse.json({
      ok: true,
      orderNumber: order.orderNumber,
      status: order.status,
      provider: payment.provider,
      liqpay,
    } satisfies CheckoutResponse);
  } catch (error) {
    return NextResponse.json(
      {
        ok: false,
        error: "server_error",
        detail:
          process.env.NODE_ENV === "development" ? String(error) : undefined,
      } satisfies CheckoutResponse,
      { status: 500 },
    );
  }
}
