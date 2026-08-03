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

/**
 * Ordering guard for overlapping requests.
 *
 * Every response here carries a complete cart, so whichever one lands last
 * wins outright — and responses do not necessarily land in the order they were
 * sent. The case that actually bit: `ensureHydrated` issues a GET on mount, the
 * visitor adds an item before it comes back, the POST answers first with a
 * one-line cart, and then the older GET arrives with the empty cart it was
 * always going to return and wipes it. The item is safely in Postgres, but the
 * badge reads "Кошик (0)" and the cart page looks empty until something else
 * refetches — so the shop appears to have swallowed the click.
 *
 * It is a narrow window on a fast connection, which is exactly why it survived:
 * it reproduced only under a loaded E2E run, and looked like a flaky test.
 *
 * The rule is therefore last-issued-wins, not last-received-wins: each request
 * takes a ticket, and a reply is discarded if a newer request has already been
 * applied. Errors are held to the same rule — a stale failure must not overwrite
 * a fresher success either.
 */
let issuedTicket = 0;
let appliedTicket = 0;

function notify() {
  for (const listener of listeners) listener();
}

function isStale(ticket: number) {
  return ticket < appliedTicket;
}

function applyView(view: CartApiView, ticket: number) {
  if (isStale(ticket)) return;
  appliedTicket = ticket;
  cache = {
    items: view.lines,
    subtotal: view.subtotal,
    isLoading: false,
    error: null,
  };
  notify();
}

function applyError(message: string, ticket: number) {
  if (isStale(ticket)) return;
  appliedTicket = ticket;
  cache = { ...cache, isLoading: false, error: message };
  notify();
}

/**
 * Issues the request and applies whatever it returns. Applying here rather
 * than at each call site is deliberate: the ticket has to be taken where the
 * request is sent, and callers that had to remember to apply the result could
 * just as easily forget to respect its ordering.
 */
async function request(
  path: string,
  init: RequestInit | undefined,
  locale: string,
): Promise<CartApiView | null> {
  const ticket = ++issuedTicket;
  const url = `${path}${path.includes("?") ? "&" : "?"}locale=${locale}`;
  try {
    const response = await fetch(url, {
      ...init,
      headers: { "Content-Type": "application/json", ...(init?.headers ?? {}) },
    });
    const body = (await response.json()) as CartApiResponse;
    if (!response.ok || !body.ok || !body.view) {
      applyError(body.error ?? "cart_request_failed", ticket);
      return null;
    }
    applyView(body.view, ticket);
    return body.view;
  } catch {
    applyError("cart_request_failed", ticket);
    return null;
  }
}

function ensureHydrated(locale: string) {
  if (hydrationStarted || typeof window === "undefined") return;
  hydrationStarted = true;
  void request("/api/cart", undefined, locale);
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
  return view !== null;
}

export async function removeCartItem(
  lineId: string,
  locale = defaultLocale,
): Promise<void> {
  await request(`/api/cart/lines/${lineId}`, { method: "DELETE" }, locale);
}

export async function setCartItemQuantity(
  lineId: string,
  quantity: number,
  locale = defaultLocale,
): Promise<void> {
  await request(
    `/api/cart/lines/${lineId}`,
    { method: "PATCH", body: JSON.stringify({ quantity }) },
    locale,
  );
}

export async function clearCart(locale = defaultLocale): Promise<void> {
  await request("/api/cart", { method: "DELETE" }, locale);
}

/** Test-only escape hatch — resets the module-level cache between test cases, mirroring `__resetProductRepositoryForTests()`'s naming in the repository layer. */
export function __resetCartStoreForTests(): void {
  cache = EMPTY_STATE;
  hydrationStarted = false;
  issuedTicket = 0;
  appliedTicket = 0;
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
