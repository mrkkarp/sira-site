import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { isLocale, defaultLocale } from "@/i18n/config";
import { readCartSessionToken } from "@/lib/cart-session";
import {
  updateLineQuantity,
  removeLine,
  getCartView,
} from "@/services/cart-service";
import { UpdateCartLineRequestSchema } from "@/lib/schemas/cart-request";
import type { CartViewResponse } from "@/app/api/cart/route";
import { isRateLimited, clientKeyFromRequest } from "@/lib/forms/rate-limit";
import { isSameOriginRequest } from "@/lib/forms/verify-same-origin";

export type CartLineMutationResponse =
  | CartViewResponse
  | { ok: false; error: "invalid_request" | "rate_limited" | "line_not_found" };

function localeFromRequest(request: NextRequest) {
  const raw = request.nextUrl.searchParams.get("locale") ?? defaultLocale;
  return isLocale(raw) ? raw : defaultLocale;
}

/** Same-origin + rate-limit guard (Phase J hardening), matching `POST
 * /api/cart/lines` — quantity updates are a state-changing mutation too.
 *
 * Prompt 9 §9/§11 — keyed off the cart's own session token (falling back to
 * `clientKeyFromRequest()` only for the token-less edge case) rather than
 * IP alone, same fix and same reasoning as `POST /api/cart/lines` — see
 * that route's doc comment for why a bare IP/`"unknown"` fallback key is a
 * real cross-visitor collision bug, not just a local-dev quirk. */
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ lineId: string }> },
) {
  if (!isSameOriginRequest(request)) {
    return NextResponse.json(
      {
        ok: false,
        error: "invalid_request",
      } satisfies CartLineMutationResponse,
      { status: 403 },
    );
  }

  const token = await readCartSessionToken();
  if (isRateLimited(`cart-update:${token ?? clientKeyFromRequest(request)}`)) {
    return NextResponse.json(
      { ok: false, error: "rate_limited" } satisfies CartLineMutationResponse,
      { status: 429 },
    );
  }
  if (!token) {
    return NextResponse.json(
      { ok: false, error: "line_not_found" } satisfies CartLineMutationResponse,
      { status: 404 },
    );
  }

  const { lineId } = await params;

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json(
      {
        ok: false,
        error: "invalid_request",
      } satisfies CartLineMutationResponse,
      { status: 400 },
    );
  }

  const parsed = UpdateCartLineRequestSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      {
        ok: false,
        error: "invalid_request",
      } satisfies CartLineMutationResponse,
      { status: 400 },
    );
  }

  const result = await updateLineQuantity(token, lineId, parsed.data.quantity);
  if (result.status !== "ok") {
    return NextResponse.json(
      { ok: false, error: "line_not_found" } satisfies CartLineMutationResponse,
      { status: 404 },
    );
  }

  const view = await getCartView(token, localeFromRequest(request));
  return NextResponse.json({
    ok: true,
    view,
  } satisfies CartLineMutationResponse);
}

/** Same-origin + rate-limit guard (Phase J hardening), matching `PATCH` above —
 * see its doc comment for why this keys off the session token, not IP alone. */
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ lineId: string }> },
) {
  if (!isSameOriginRequest(request)) {
    return NextResponse.json(
      {
        ok: false,
        error: "invalid_request",
      } satisfies CartLineMutationResponse,
      { status: 403 },
    );
  }

  const token = await readCartSessionToken();
  if (isRateLimited(`cart-remove:${token ?? clientKeyFromRequest(request)}`)) {
    return NextResponse.json(
      { ok: false, error: "rate_limited" } satisfies CartLineMutationResponse,
      { status: 429 },
    );
  }
  if (!token) {
    return NextResponse.json(
      { ok: false, error: "line_not_found" } satisfies CartLineMutationResponse,
      { status: 404 },
    );
  }

  const { lineId } = await params;

  const result = await removeLine(token, lineId);
  if (result.status !== "ok") {
    return NextResponse.json(
      { ok: false, error: "line_not_found" } satisfies CartLineMutationResponse,
      { status: 404 },
    );
  }

  const view = await getCartView(token, localeFromRequest(request));
  return NextResponse.json({
    ok: true,
    view,
  } satisfies CartLineMutationResponse);
}
