import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { z } from "zod";
import { getOrderRepository } from "@/repositories/order-repository";
import { isRateLimited, clientKeyFromRequest } from "@/lib/forms/rate-limit";
import { isSameOriginRequest } from "@/lib/forms/verify-same-origin";
import { resolveLocaleContent } from "@/domain/shared/locale-content";
import { isLocale, defaultLocale } from "@/i18n/config";

const OrderStatusRequest = z.object({
  orderNumber: z.string().trim().min(1),
  phone: z.string().trim().min(7),
});

export type OrderStatusResponse =
  | {
      ok: true;
      order: {
        orderNumber: string;
        status: string;
        currency: string;
        totalMinorUnits: number;
        createdAt: string;
        lines: {
          name: string;
          quantity: number;
          lineTotalMinorUnits: number;
        }[];
      };
    }
  | { ok: false; error: "invalid_input" | "rate_limited" | "not_found" };

/** Strips everything but digits, so "+380 50 123 45 67" and "0501234567" compare equal. */
function normalizePhone(phone: string): string {
  return phone.replace(/\D/g, "");
}

/**
 * Public guest order-status lookup (Prompt 8 §2.3/§11, Phase F). Guest
 * checkout has no account/session to authorize a lookup with, so this
 * requires **both** `orderNumber` and the `phone` that was on the order
 * — knowing one alone (an order number is realistically guessable/
 * enumerable) must never be enough to see someone else's order. Only a
 * narrow, non-sensitive projection of the order is ever returned: no
 * full customer email/notes/address, no payment details.
 */
export async function POST(request: NextRequest) {
  if (!isSameOriginRequest(request)) {
    return NextResponse.json(
      { ok: false, error: "invalid_input" } satisfies OrderStatusResponse,
      { status: 403 },
    );
  }
  if (isRateLimited(`order-status:${clientKeyFromRequest(request)}`)) {
    return NextResponse.json(
      { ok: false, error: "rate_limited" } satisfies OrderStatusResponse,
      { status: 429 },
    );
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json(
      { ok: false, error: "invalid_input" } satisfies OrderStatusResponse,
      { status: 400 },
    );
  }

  const parsed = OrderStatusRequest.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { ok: false, error: "invalid_input" } satisfies OrderStatusResponse,
      { status: 400 },
    );
  }

  const raw = request.nextUrl.searchParams.get("locale") ?? defaultLocale;
  const locale = isLocale(raw) ? raw : defaultLocale;

  const orderRepository = await getOrderRepository();
  const order = await orderRepository.findByOrderNumber(
    parsed.data.orderNumber,
  );

  // Same generic "not_found" for a missing order and a phone mismatch —
  // never let the response distinguish the two cases, or it becomes an
  // oracle for enumerating valid order numbers.
  if (
    !order ||
    normalizePhone(order.customer.phone) !== normalizePhone(parsed.data.phone)
  ) {
    return NextResponse.json(
      { ok: false, error: "not_found" } satisfies OrderStatusResponse,
      { status: 404 },
    );
  }

  return NextResponse.json({
    ok: true,
    order: {
      orderNumber: order.orderNumber,
      status: order.status,
      currency: order.total.currency,
      totalMinorUnits: order.total.minorUnits,
      createdAt: order.createdAt,
      lines: order.lines.map((line) => ({
        name: resolveLocaleContent(line.name, locale),
        quantity: line.quantity,
        lineTotalMinorUnits: line.lineTotal.minorUnits,
      })),
    },
  } satisfies OrderStatusResponse);
}
