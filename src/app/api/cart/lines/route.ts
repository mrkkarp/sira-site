import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { isLocale, defaultLocale } from "@/i18n/config";
import { ensureCartSessionToken } from "@/lib/cart-session";
import { addLineToCart, getCartView } from "@/services/cart-service";
import { AddCartLineRequestSchema } from "@/lib/schemas/cart-request";
import type { CartViewResponse } from "@/app/api/cart/route";
import { isRateLimited } from "@/lib/forms/rate-limit";
import { isSameOriginRequest } from "@/lib/forms/verify-same-origin";

export type AddCartLineResponse =
  | CartViewResponse
  | {
      ok: false;
      error:
        | "invalid_request"
        | "rate_limited"
        | "product_not_found"
        | "variant_not_found"
        | "not_orderable"
        | "no_price";
    };

function localeFromRequest(request: NextRequest) {
  const raw = request.nextUrl.searchParams.get("locale") ?? defaultLocale;
  return isLocale(raw) ? raw : defaultLocale;
}

/** Same-origin + rate-limit guard (Phase J hardening) — a cart-line add is a
 * state-changing mutation keyed off the visitor's own cart cookie, same
 * reasoning as the checkout/forms routes' hardening.
 *
 * Prompt 9 §9/§11 (e2e + security audit) — this used to key the limiter off
 * `clientKeyFromRequest()` (real IP behind a trusted proxy, else the
 * literal string `"unknown"`). That fallback is a real bug, not just a
 * local dev quirk: any deployment where the reverse proxy doesn't set
 * `x-forwarded-for` (or any client connecting without one) collapses onto
 * one shared `"unknown"` bucket for the WHOLE site combined, so a handful
 * of concurrent add-to-cart clicks from unrelated visitors could each 429
 * the others out — discovered via a genuinely flaky e2e suite (parallel
 * Playwright workers all hit the same `"unknown"` key locally). The cart
 * already has a real per-visitor identity for this exact purpose — its own
 * session cookie — so rate-limit by that instead of best-effort IP.
 */
export async function POST(request: NextRequest) {
  if (!isSameOriginRequest(request)) {
    return NextResponse.json(
      { ok: false, error: "invalid_request" } satisfies AddCartLineResponse,
      { status: 403 },
    );
  }

  const token = await ensureCartSessionToken();
  if (isRateLimited(`cart-add:${token}`)) {
    return NextResponse.json(
      { ok: false, error: "rate_limited" } satisfies AddCartLineResponse,
      { status: 429 },
    );
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json(
      { ok: false, error: "invalid_request" } satisfies AddCartLineResponse,
      { status: 400 },
    );
  }

  const parsed = AddCartLineRequestSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { ok: false, error: "invalid_request" } satisfies AddCartLineResponse,
      { status: 400 },
    );
  }

  const result = await addLineToCart(token, parsed.data);

  if (result.status !== "ok") {
    const errorByStatus = {
      productNotFound: "product_not_found",
      variantNotFound: "variant_not_found",
      notOrderable: "not_orderable",
      noPrice: "no_price",
    } as const;
    return NextResponse.json(
      {
        ok: false,
        error: errorByStatus[result.status],
      } satisfies AddCartLineResponse,
      { status: 422 },
    );
  }

  const view = await getCartView(token, localeFromRequest(request));
  return NextResponse.json({ ok: true, view } satisfies AddCartLineResponse);
}
