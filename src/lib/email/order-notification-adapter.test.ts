import { describe, expect, it, vi, beforeEach, afterEach } from "vitest";
import {
  buildOrderSummaryText,
  getOrderNotificationAdapter,
  __resetOrderNotificationAdapterForTests,
} from "./order-notification-adapter";
import type { Order } from "@/domain/ecommerce/order";

/**
 * A realistic placed order: two lines, one of them with a chosen option, a
 * Nova Poshta branch delivery, and a customer comment — i.e. every branch the
 * summary builder has to render.
 */
const order = {
  id: "order-1",
  orderNumber: "OD-20260801-0001",
  lines: [
    {
      id: "line-1",
      productId: "product-1",
      variantId: "variant-1",
      sku: "STIL-URBAN-120",
      name: { uk: "Стіл Urban 120" },
      quantity: 1,
      unitPrice: { currency: "UAH", minorUnits: 1850000 },
      lineTotal: { currency: "UAH", minorUnits: 1850000 },
      options: [
        { optionKey: "colour", value: "graphite", label: { uk: "Колір" } },
      ],
    },
    {
      id: "line-2",
      productId: "product-2",
      variantId: "variant-2",
      sku: "VAZON-CUBE-30",
      name: { uk: "Вазон Cube 30" },
      quantity: 2,
      unitPrice: { currency: "UAH", minorUnits: 120000 },
      lineTotal: { currency: "UAH", minorUnits: 240000 },
      options: [],
    },
  ],
  subtotal: { currency: "UAH", minorUnits: 2090000 },
  discountTotal: { currency: "UAH", minorUnits: 0 },
  deliveryTotal: { currency: "UAH", minorUnits: 0 },
  total: { currency: "UAH", minorUnits: 2090000 },
  deliveryMethod: {
    type: "novaPoshtaBranch",
    cityName: "Київ",
    branchNumber: "42",
  },
  customer: {
    fullName: "Марко Карпенко",
    phone: "+380671112233",
    email: "marko@example.com",
  },
  status: "pending",
  notes: "Зателефонуйте після 18:00",
  createdAt: new Date().toISOString(),
  updatedAt: new Date().toISOString(),
} as unknown as Order;

describe("buildOrderSummaryText", () => {
  it("includes everything staff need to fulfil the order without opening the admin", () => {
    const text = buildOrderSummaryText(order);

    expect(text).toContain("OD-20260801-0001");
    expect(text).toContain("Марко Карпенко");
    expect(text).toContain("+380671112233");
    expect(text).toContain("marko@example.com");
    // Delivery is spelled out per union branch, not key-dumped.
    expect(text).toContain("Нова Пошта, відділення — Київ, №42");
    // Both lines, with SKU and quantity, plus the chosen option.
    expect(text).toContain("Стіл Urban 120");
    expect(text).toContain("STIL-URBAN-120");
    expect(text).toContain("Колір: graphite");
    expect(text).toContain("Вазон Cube 30");
    expect(text).toContain("× 2");
    expect(text).toContain("Зателефонуйте після 18:00");
  });

  it("formats money from integer minor units without re-deriving totals", () => {
    const text = buildOrderSummaryText(order);
    // 2_090_000 kopecks === 20900.00 UAH — never floating-point arithmetic.
    expect(text).toContain("Разом: 20900.00 UAH");
    expect(text).toContain("2400.00 UAH");
  });
});

describe("getOrderNotificationAdapter", () => {
  const originalEnv = { ...process.env };

  beforeEach(() => {
    vi.restoreAllMocks();
    __resetOrderNotificationAdapterForTests();
    process.env = { ...originalEnv };
    delete process.env.RESEND_API_KEY;
    delete process.env.ORDER_NOTIFICATION_EMAIL;
    delete process.env.LEADS_NOTIFICATION_EMAIL;
    delete process.env.EMAIL_FROM;
  });

  afterEach(() => {
    process.env = { ...originalEnv };
  });

  it("falls back to the console adapter when Resend isn't configured", async () => {
    const infoSpy = vi.spyOn(console, "info").mockImplementation(() => {});
    const fetchMock = vi.fn();
    vi.stubGlobal("fetch", fetchMock);

    await getOrderNotificationAdapter().notifyNewOrder(order);

    expect(fetchMock).not.toHaveBeenCalled();
    // The whole summary is logged, so an unconfigured production deploy still
    // leaves a complete record of the order in the server log.
    expect(infoSpy).toHaveBeenCalledWith(
      expect.stringContaining("OD-20260801-0001"),
    );
    expect(infoSpy).toHaveBeenCalledWith(
      expect.stringContaining("Марко Карпенко"),
    );
  });

  it("emails the order to staff when fully configured", async () => {
    process.env.RESEND_API_KEY = "test-key";
    process.env.LEADS_NOTIFICATION_EMAIL = "sales@odudlab.example";
    process.env.EMAIL_FROM = "noreply@odudlab.example";
    __resetOrderNotificationAdapterForTests();

    const fetchMock = vi.fn().mockResolvedValue({ ok: true });
    vi.stubGlobal("fetch", fetchMock);

    await getOrderNotificationAdapter().notifyNewOrder(order);

    expect(fetchMock).toHaveBeenCalledTimes(1);
    const [url, init] = fetchMock.mock.calls[0];
    expect(url).toBe("https://api.resend.com/emails");
    const body = JSON.parse((init as RequestInit).body as string);
    expect(body).toMatchObject({
      from: "noreply@odudlab.example",
      to: "sales@odudlab.example",
    });
    // The order number and total are in the subject so staff can triage from
    // the inbox list without opening the mail.
    expect(body.subject).toContain("OD-20260801-0001");
    expect(body.subject).toContain("20900.00 UAH");
    expect(body.text).toContain("Стіл Urban 120");
  });

  it("prefers ORDER_NOTIFICATION_EMAIL over the leads inbox when both are set", async () => {
    process.env.RESEND_API_KEY = "test-key";
    process.env.LEADS_NOTIFICATION_EMAIL = "leads@odudlab.example";
    process.env.ORDER_NOTIFICATION_EMAIL = "orders@odudlab.example";
    process.env.EMAIL_FROM = "noreply@odudlab.example";
    __resetOrderNotificationAdapterForTests();

    const fetchMock = vi.fn().mockResolvedValue({ ok: true });
    vi.stubGlobal("fetch", fetchMock);

    await getOrderNotificationAdapter().notifyNewOrder(order);

    const body = JSON.parse(
      (fetchMock.mock.calls[0][1] as RequestInit).body as string,
    );
    expect(body.to).toBe("orders@odudlab.example");
  });

  it("falls back to the leads inbox when no order-specific inbox is set", async () => {
    process.env.RESEND_API_KEY = "test-key";
    process.env.LEADS_NOTIFICATION_EMAIL = "leads@odudlab.example";
    process.env.EMAIL_FROM = "noreply@odudlab.example";
    __resetOrderNotificationAdapterForTests();

    const fetchMock = vi.fn().mockResolvedValue({ ok: true });
    vi.stubGlobal("fetch", fetchMock);

    await getOrderNotificationAdapter().notifyNewOrder(order);

    const body = JSON.parse(
      (fetchMock.mock.calls[0][1] as RequestInit).body as string,
    );
    expect(body.to).toBe("leads@odudlab.example");
  });

  it("throws when the Resend API responds with an error", async () => {
    process.env.RESEND_API_KEY = "test-key";
    process.env.LEADS_NOTIFICATION_EMAIL = "sales@odudlab.example";
    process.env.EMAIL_FROM = "noreply@odudlab.example";
    __resetOrderNotificationAdapterForTests();

    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue({ ok: false, status: 500 }),
    );

    await expect(
      getOrderNotificationAdapter().notifyNewOrder(order),
    ).rejects.toThrow("resend_order_notification_failed");
  });
});
