import "server-only";
import { cookies } from "next/headers";

/**
 * Cart session cookie (Prompt 8 §2.3/§6, Phase D) — `Cart.sessionToken`
 * (see `src/domain/ecommerce/cart.ts`) is looked up by this opaque
 * value, never by a customer account (guest checkout only). Strictly
 * necessary for the cart to function at all (it's the only way the
 * server finds "this visitor's" cart row), so it doesn't need the
 * cookie-consent opt-in that `CookieConsent`/analytics cookies do.
 */
export const CART_COOKIE_NAME = "odudlab_cart";
const CART_COOKIE_MAX_AGE_SECONDS = 60 * 60 * 24 * 60; // 60 days, matches Cart.expiresAt's intent

/** Read-only — safe to call from a Server Component (page/layout) render, where `cookies().set()` is not allowed. Returns `null` if the visitor has never touched the cart yet. */
export async function readCartSessionToken(): Promise<string | null> {
  const store = await cookies();
  return store.get(CART_COOKIE_NAME)?.value ?? null;
}

/** Must be called from a Route Handler or Server Action, where setting an outgoing cookie is allowed. Reuses the existing token if present, otherwise mints a fresh opaque one and sets the cookie. */
export async function ensureCartSessionToken(): Promise<string> {
  const store = await cookies();
  const existing = store.get(CART_COOKIE_NAME)?.value;
  if (existing) return existing;

  const token = crypto.randomUUID();
  store.set(CART_COOKIE_NAME, token, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: CART_COOKIE_MAX_AGE_SECONDS,
  });
  return token;
}
