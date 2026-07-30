import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { isLocale, defaultLocale } from "@/i18n/config";
import { readCartSessionToken } from "@/lib/cart-session";
import { getCartView, clearCart, type CartView } from "@/services/cart-service";
import { isRateLimited, clientKeyFromRequest } from "@/lib/forms/rate-limit";
import { isSameOriginRequest } from "@/lib/forms/verify-same-origin";

export type CartViewResponse = { ok: true; view: CartView };
export type CartMutationResponse =
  CartViewResponse | { ok: false; error: "invalid_request" | "rate_limited" };

function localeFromRequest(request: NextRequest) {
  const raw = request.nextUrl.searchParams.get("locale") ?? defaultLocale;
  return isLocale(raw) ? raw : defaultLocale;
}

/** Read the live, server-persisted cart. Deliberately doesn't call `ensureCartSessionToken()` — a visitor who has never touched the cart shouldn't get a cookie dropped just for loading a page. Read-only, so unlike the mutating handlers below it doesn't need the same-origin/rate-limit guard. */
export async function GET(request: NextRequest) {
  const token = await readCartSessionToken();
  const view = token
    ? await getCartView(token, localeFromRequest(request))
    : { lines: [], currency: "UAH", count: 0, subtotal: 0 };
  return NextResponse.json({ ok: true, view } satisfies CartViewResponse);
}

/**
 * Clears the whole cart (the "empty cart" action on `/cart`). A no-op, not
 * an error, if the visitor never had a session token in the first place.
 * Same-origin + rate-limit guard (Phase J hardening) matches the other
 * cart-mutation routes — a state-changing endpoint reachable with just
 * the visitor's own cart cookie shouldn't be missing the same CSRF/abuse
 * guard every other public mutation route already has.
 *
 * Prompt 9 §9/§11 — keyed off the cart's own session token (falling back to
 * `clientKeyFromRequest()` only when there's no token at all), not IP alone
 * — see `POST /api/cart/lines`'s doc comment for why a bare IP/`"unknown"`
 * fallback key is a real cross-visitor collision bug.
 */
export async function DELETE(request: NextRequest) {
  if (!isSameOriginRequest(request)) {
    return NextResponse.json(
      { ok: false, error: "invalid_request" } satisfies CartMutationResponse,
      { status: 403 },
    );
  }

  const token = await readCartSessionToken();
  if (isRateLimited(`cart-clear:${token ?? clientKeyFromRequest(request)}`)) {
    return NextResponse.json(
      { ok: false, error: "rate_limited" } satisfies CartMutationResponse,
      { status: 429 },
    );
  }

  if (token) await clearCart(token);
  const view = { lines: [], currency: "UAH", count: 0, subtotal: 0 };
  return NextResponse.json({ ok: true, view } satisfies CartViewResponse);
}
