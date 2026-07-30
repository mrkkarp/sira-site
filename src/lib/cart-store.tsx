"use client";

import { useCallback, useEffect, useMemo, useSyncExternalStore } from "react";
import { usePathname } from "next/navigation";
import { locales, defaultLocale } from "@/i18n/config";
import { detectLocaleFromPathname } from "@/i18n/client-strings";

/**
 * Client-side mirror of the server-persisted cart (Prompt 8 §2.3/§6,
 * Phase D). Unlike the earlier localStorage-only version of this file,
 * the cart itself now lives in Postgres behind `/api/cart/*` (see
 * `src/services/cart-service.ts`) — this module is a thin cache in
 * front of that API, not the source of truth. It mirrors the previous
 * `useSyncExternalStore` shape (one module-level cache + listener set)
 * so `CartButton`/`AddToCartButton` barely had to change, but every
 * mutation is now a real network round trip: there is no optimistic
 * guess at a line's name/price, because the client never has the
 * authoritative catalog data to guess with — it always renders back
 * whatever the server just computed.
 */
export interface CartLineItem {
  id: string;
  productSlug: string;
  productName: string;
  variantSku: string;
  variantLabel?: string;
  mediaId?: string;
  quantity: number;
  unitPrice: number;
  currentPrice: number | null;
  priceChanged: boolean;
  orderable: boolean;
  currency: string;
}

interface CartApiView {
  lines: CartLineItem[];
  currency: string;
  count: number;
  subtotal: number;
}

interface CartApiResponse {
  ok: boolean;
  view?: CartApiView;
  error?: string;
}

interface CartState {
  items: CartLineItem[];
  subtotal: number;
  isLoading: boolean;
  error: string | null;
}

const EMPTY_STATE: CartState = {
  items: [],
  subtotal: 0,
  isLoading: true,
  error: null,
};

let cache: CartState = EMPTY_STATE;
let hydrationStarted = false;
const listeners = new Set<() => void>();

function notify() {
  for (const listener of listeners) listener();
}

function applyView(view: CartApiView) {
  cache = {
    items: view.lines,
    subtotal: view.subtotal,
    isLoading: false,
    error: null,
  };
  notify();
}

function applyError(message: string) {
  cache = { ...cache, isLoading: false, error: message };
  notify();
}

async function request(
  path: string,
  init: RequestInit | undefined,
  locale: string,
): Promise<CartApiView | null> {
  const url = `${path}${path.includes("?") ? "&" : "?"}locale=${locale}`;
  try {
    const response = await fetch(url, {
      ...init,
      headers: { "Content-Type": "application/json", ...(init?.headers ?? {}) },
    });
    const body = (await response.json()) as CartApiResponse;
    if (!response.ok || !body.ok || !body.view) {
      applyError(body.error ?? "cart_request_failed");
      return null;
    }
    return body.view;
  } catch {
    applyError("cart_request_failed");
    return null;
  }
}

function ensureHydrated(locale: string) {
  if (hydrationStarted || typeof window === "undefined") return;
  hydrationStarted = true;
  void request("/api/cart", undefined, locale).then((view) => {
    if (view) applyView(view);
  });
}

function subscribe(onStoreChange: () => void) {
  listeners.add(onStoreChange);
  return () => listeners.delete(onStoreChange);
}

function getSnapshot(): CartState {
  return cache;
}

/** SSR/first-hydration pass has no cookie context — a fixed empty/loading state keeps the server-rendered markup and the client's first paint identical; the real cart is fetched once mounted. */
function getServerSnapshot(): CartState {
  return EMPTY_STATE;
}

/**
 * Returns whether the add actually succeeded — Prompt 9 §9/§11 (e2e audit):
 * `request()` never throws (network/HTTP failures are captured into
 * `cache.error` instead), so callers that don't check this return value
 * have no way to distinguish a real add from a silent failure (e.g. a
 * same-origin/rate-limit rejection) — see `useAddToCartAction`'s fix for
 * why that distinction matters for the success toast it shows.
 */
export async function addCartItem(
  input: { slug: string; variantSku: string },
  quantity = 1,
  locale = defaultLocale,
): Promise<boolean> {
  const view = await request(
    "/api/cart/lines",
    { method: "POST", body: JSON.stringify({ ...input, quantity }) },
    locale,
  );
  if (view) applyView(view);
  return view !== null;
}

export async function removeCartItem(
  lineId: string,
  locale = defaultLocale,
): Promise<void> {
  const view = await request(
    `/api/cart/lines/${lineId}`,
    { method: "DELETE" },
    locale,
  );
  if (view) applyView(view);
}

export async function setCartItemQuantity(
  lineId: string,
  quantity: number,
  locale = defaultLocale,
): Promise<void> {
  const view = await request(
    `/api/cart/lines/${lineId}`,
    { method: "PATCH", body: JSON.stringify({ quantity }) },
    locale,
  );
  if (view) applyView(view);
}

export async function clearCart(locale = defaultLocale): Promise<void> {
  const view = await request("/api/cart", { method: "DELETE" }, locale);
  if (view) applyView(view);
}

/** Test-only escape hatch — resets the module-level cache between test cases, mirroring `__resetProductRepositoryForTests()`'s naming in the repository layer. */
export function __resetCartStoreForTests(): void {
  cache = EMPTY_STATE;
  hydrationStarted = false;
  listeners.clear();
}

export function useCart() {
  const pathname = usePathname();
  const locale = useMemo(
    () => detectLocaleFromPathname(pathname ?? "/", locales, defaultLocale),
    [pathname],
  );

  const state = useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);

  useEffect(() => {
    ensureHydrated(locale);
  }, [locale]);

  const count = useMemo(
    () => state.items.reduce((sum, line) => sum + line.quantity, 0),
    [state.items],
  );

  const addItem = useCallback(
    (input: { slug: string; variantSku: string }, quantity = 1) =>
      addCartItem(input, quantity, locale),
    [locale],
  );
  const removeItem = useCallback(
    (lineId: string) => removeCartItem(lineId, locale),
    [locale],
  );
  const setQuantity = useCallback(
    (lineId: string, quantity: number) =>
      setCartItemQuantity(lineId, quantity, locale),
    [locale],
  );
  const clear = useCallback(() => clearCart(locale), [locale]);

  return {
    items: state.items,
    count,
    subtotal: state.subtotal,
    isLoading: state.isLoading,
    error: state.error,
    addItem,
    removeItem,
    setQuantity,
    clear,
  };
}
