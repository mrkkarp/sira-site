import { describe, expect, it, vi, beforeEach, afterEach } from "vitest";
import { NextRequest } from "next/server";
import { HONEYPOT_FIELD } from "@/lib/forms/honeypot";
import { __resetRateLimitForTests } from "@/lib/forms/rate-limit";
import type { Order } from "@/domain/ecommerce/order";
import type { Payment } from "@/domain/ecommerce/payment";

/**
 * `POST /api/checkout` — the one endpoint in the app where a bug costs a
 * real, paid-for order rather than a lead. Everything here is about the
 * cases where the route must *not* mislead the customer about whether their
 * order exists:
 *
 *  - the staff notification is a side effect of an order that is already
 *    committed to Postgres, so a Resend outage must never turn into a 500 —
 *    the customer would see an error for an order that really was placed and
 *    re-submit it,
 *  - the honeypot answers with a fake success on purpose (so bots can't
 *    detect the filter), which is only safe as long as it creates nothing,
 *  - a LiqPay order's `result_url`/`server_url` are the customer's way back
 *    and LiqPay's way to report payment; if either is built from the wrong
 *    base the money moves but nothing in this app ever hears about it.
 */

const order = {
  id: "order-1",
  orderNumber: "SO-20260801-A1B2C3",
  status: "pending",
  total: { currency: "UAH", minorUnits: 2090000 },
} as unknown as Order;

const manualPayment = {
  id: "payment-1",
  orderId: "order-1",
  provider: "manual",
  status: "pending",
} as unknown as Payment;

const liqpayPayment = {
  ...manualPayment,
  provider: "liqpay",
} as unknown as Payment;

const placeOrderMock = vi.hoisted(() => vi.fn());
const readCartSessionTokenMock = vi.hoisted(() => vi.fn());
const notifyNewOrderMock = vi.hoisted(() => vi.fn());

vi.mock("@/services/order-service", () => ({
  placeOrder: placeOrderMock,
}));
vi.mock("@/lib/cart-session", () => ({
  readCartSessionToken: readCartSessionTokenMock,
}));
vi.mock("@/lib/email/order-notification-adapter", () => ({
  getOrderNotificationAdapter: () => ({ notifyNewOrder: notifyNewOrderMock }),
}));

const { POST } = await import("./route");

/** The LiqPay adapter is left real, so the payload assertions below decode a genuinely-signed `data` blob rather than a stub's echo of its own arguments. */
function validBody(overrides: Record<string, unknown> = {}) {
  return {
    customer: {
      fullName: "Олена Коваль",
      phone: "+380671234567",
      email: "olena@example.com",
    },
    deliveryMethod: {
      type: "novaPoshtaBranch",
      cityName: "Київ",
      branchNumber: "12",
    },
    notes: "Подзвоніть після 18:00",
    ...overrides,
  };
}

function makeRequest(
  body: unknown,
  {
    query = "",
    headers = {},
  }: { query?: string; headers?: Record<string, string> } = {},
) {
  return new NextRequest(`http://localhost:3000/api/checkout${query}`, {
    method: "POST",
    headers: {
      host: "localhost:3000",
      "content-type": "application/json",
      ...headers,
    },
    body: JSON.stringify(body),
  });
}

function decodeLiqPayData(data: string): Record<string, unknown> {
  return JSON.parse(Buffer.from(data, "base64").toString("utf8"));
}

describe("POST /api/checkout", () => {
  const originalEnv = { ...process.env };

  beforeEach(() => {
    vi.restoreAllMocks();
    vi.clearAllMocks();
    __resetRateLimitForTests();
    process.env = { ...originalEnv };
    delete process.env.LIQPAY_PUBLIC_KEY;
    delete process.env.LIQPAY_PRIVATE_KEY;
    delete process.env.NEXT_PUBLIC_SERVER_URL;
    readCartSessionTokenMock.mockResolvedValue("cart-token-1");
    placeOrderMock.mockResolvedValue({
      status: "ok",
      order,
      payment: manualPayment,
    });
    notifyNewOrderMock.mockResolvedValue(undefined);
  });

  afterEach(() => {
    process.env = { ...originalEnv };
  });

  it("creates no order when the honeypot is filled, while still answering as if it had", async () => {
    const warn = vi.spyOn(console, "warn").mockImplementation(() => {});

    const response = await POST(
      makeRequest(validBody({ [HONEYPOT_FIELD]: "spam" })),
    );

    expect(response.status).toBe(200);
    expect(await response.json()).toEqual({
      ok: true,
      orderNumber: "",
      status: "pending",
      provider: "manual",
    });
    // The whole point of the fake success is that nothing was charged or
    // reserved behind it — an empty order number is what the client keys on
    // to refuse to render a confirmation.
    expect(placeOrderMock).not.toHaveBeenCalled();
    expect(notifyNewOrderMock).not.toHaveBeenCalled();
    // Logged so a false positive (an extension autofilling the hidden field
    // for a real customer) is discoverable at all.
    expect(warn).toHaveBeenCalled();
  });

  it("places a manual order and tells staff about it exactly once", async () => {
    const response = await POST(makeRequest(validBody()));

    expect(response.status).toBe(200);
    expect(await response.json()).toEqual({
      ok: true,
      orderNumber: order.orderNumber,
      status: order.status,
      provider: "manual",
    });
    expect(placeOrderMock).toHaveBeenCalledWith("cart-token-1", {
      customer: expect.objectContaining({ phone: "+380671234567" }),
      deliveryMethod: expect.objectContaining({ type: "novaPoshtaBranch" }),
      notes: "Подзвоніть після 18:00",
    });
    expect(notifyNewOrderMock).toHaveBeenCalledTimes(1);
    expect(notifyNewOrderMock).toHaveBeenCalledWith(order);
  });

  it("still confirms the real order number when the staff notification throws", async () => {
    // The regression this guards: the order is already committed to Postgres
    // by the time the notification runs, so a Resend outage bubbling out as a
    // 500 would show an error for an order that exists — and the customer
    // would place it a second time.
    const error = vi.spyOn(console, "error").mockImplementation(() => {});
    notifyNewOrderMock.mockRejectedValue(new Error("resend is down"));

    const response = await POST(makeRequest(validBody()));

    expect(response.status).toBe(200);
    expect(await response.json()).toEqual({
      ok: true,
      orderNumber: order.orderNumber,
      status: order.status,
      provider: "manual",
    });
    // Left for the admin panel, which stays the source of truth.
    expect(error).toHaveBeenCalled();
  });

  it("returns a LiqPay payload whose URLs point at the configured public origin", async () => {
    process.env.LIQPAY_PUBLIC_KEY = "test-public-key";
    process.env.LIQPAY_PRIVATE_KEY = "test-private-key";
    process.env.NEXT_PUBLIC_SERVER_URL = "https://odudlab.com";
    placeOrderMock.mockResolvedValue({
      status: "ok",
      order,
      payment: liqpayPayment,
    });

    const response = await POST(
      makeRequest(validBody(), { query: "?locale=en" }),
    );
    const json = await response.json();

    expect(json.provider).toBe("liqpay");
    expect(json.liqpay.checkoutUrl).toBe(
      "https://www.liqpay.ua/api/3/checkout",
    );
    expect(json.liqpay.signature).toEqual(expect.any(String));

    const payload = decodeLiqPayData(json.liqpay.data);
    expect(payload.order_id).toBe(order.orderNumber);
    // Must be the deployment's public origin, never the request host: LiqPay
    // calls `server_url` from its own infrastructure, and a localhost/preview
    // host there means a paid order is never marked paid.
    expect(payload.result_url).toBe("https://odudlab.com/en/order-status");
    expect(payload.server_url).toBe(
      "https://odudlab.com/api/checkout/liqpay-callback",
    );
  });

  it("falls back to the default locale for an unrecognised ?locale=", async () => {
    // `locale` lands inside a URL path, so an unvalidated value would let a
    // crafted link send the customer somewhere else after paying.
    process.env.LIQPAY_PUBLIC_KEY = "test-public-key";
    process.env.LIQPAY_PRIVATE_KEY = "test-private-key";
    process.env.NEXT_PUBLIC_SERVER_URL = "https://odudlab.com";
    placeOrderMock.mockResolvedValue({
      status: "ok",
      order,
      payment: liqpayPayment,
    });

    const response = await POST(
      makeRequest(validBody(), { query: "?locale=../evil.example" }),
    );
    const payload = decodeLiqPayData((await response.json()).liqpay.data);

    expect(payload.result_url).toBe("https://odudlab.com/uk/order-status");
  });

  it("omits the liqpay payload entirely on the manual path", async () => {
    const response = await POST(makeRequest(validBody()));

    expect(await response.json()).not.toHaveProperty("liqpay");
  });

  it("reports cart_empty when the cart turned out to be empty at submit time", async () => {
    placeOrderMock.mockResolvedValue({ status: "cartEmpty" });

    const response = await POST(makeRequest(validBody()));

    expect(response.status).toBe(422);
    expect(await response.json()).toEqual({ ok: false, error: "cart_empty" });
    expect(notifyNewOrderMock).not.toHaveBeenCalled();
  });

  it("names the offending sku when a line is no longer available", async () => {
    // The sku is the only thing that lets the customer work out *which* item
    // to remove — a bare "line_unavailable" leaves a multi-line cart unfixable.
    placeOrderMock.mockResolvedValue({
      status: "lineUnavailable",
      sku: "OD-BASIN-01",
    });

    const response = await POST(makeRequest(validBody()));

    expect(response.status).toBe(422);
    expect(await response.json()).toEqual({
      ok: false,
      error: "line_unavailable",
      detail: "OD-BASIN-01",
    });
  });

  it("refuses to place an order for a visitor with no cart session cookie", async () => {
    readCartSessionTokenMock.mockResolvedValue(null);

    const response = await POST(makeRequest(validBody()));

    expect(response.status).toBe(422);
    expect(await response.json()).toEqual({ ok: false, error: "cart_empty" });
    // Without a token `placeOrder` would have nothing to look the cart up by.
    expect(placeOrderMock).not.toHaveBeenCalled();
  });

  it("rejects a body that fails schema validation before touching the cart", async () => {
    const response = await POST(
      makeRequest(validBody({ customer: { fullName: "Олена Коваль" } })),
    );

    expect(response.status).toBe(400);
    expect((await response.json()).error).toBe("invalid_input");
    expect(placeOrderMock).not.toHaveBeenCalled();
  });

  it("rejects a cross-origin submission", async () => {
    const response = await POST(
      makeRequest(validBody(), { headers: { origin: "https://evil.example" } }),
    );

    expect(response.status).toBe(403);
    expect(placeOrderMock).not.toHaveBeenCalled();
  });

  it("answers a generic server_error when placing the order throws", async () => {
    placeOrderMock.mockRejectedValue(new Error("postgres is unreachable"));

    const response = await POST(makeRequest(validBody()));

    expect(response.status).toBe(500);
    expect((await response.json()).error).toBe("server_error");
  });

  it("rate-limits repeated submissions from the same client", async () => {
    for (let i = 0; i < 5; i++) await POST(makeRequest(validBody()));

    const response = await POST(makeRequest(validBody()));

    expect(response.status).toBe(429);
    expect(placeOrderMock).toHaveBeenCalledTimes(5);
  });
});
