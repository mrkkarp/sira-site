import "server-only";
import type { Order } from "@/domain/ecommerce/order";
import { moneyToDecimal, type Money } from "@/domain/shared/money";
import { resolveLocaleContent } from "@/domain/shared/locale-content";

/**
 * Adapter for notifying ODUDLAB staff that a **new order** was placed.
 *
 * This exists because an order used to be completely silent: `placeOrder()`
 * wrote the `Order` row and returned, `Orders` has no Payload hooks, and the
 * checkout route never notified anyone — so a real, paid-for order sat in
 * Postgres until somebody happened to open the admin panel. For a low-volume,
 * high-value catalogue that is the worst possible failure mode, worse than an
 * outright 500 (which at least tells the customer to phone).
 *
 * Deliberately mirrors `LeadNotificationAdapter`'s shape (narrow interface,
 * Resend-over-plain-HTTP, console fallback) so both notification paths behave
 * and degrade identically, and swapping in a CRM/Telegram push later means
 * adding a class here rather than touching the checkout route.
 */
export interface OrderNotificationAdapter {
  notifyNewOrder(order: Order): Promise<void>;
}

/**
 * Dev/no-config fallback — logs the full order summary to the server log
 * instead of emailing it. Runs whenever `RESEND_API_KEY` / `EMAIL_FROM` /
 * the recipient address aren't configured, so checkout works end-to-end in
 * local dev with zero setup.
 *
 * The whole summary (not just the id) is logged on purpose: if production is
 * ever running without email configured, the server log is then the only
 * remaining record of what the customer actually asked for.
 */
class ConsoleOrderNotificationAdapter implements OrderNotificationAdapter {
  async notifyNewOrder(order: Order): Promise<void> {
    console.info(
      `[order-notification] console adapter — new order ${order.orderNumber} (no email provider configured)\n${buildOrderSummaryText(order)}`,
    );
  }
}

/** Real adapter, calling Resend's plain HTTP API directly (no SDK needed for one endpoint). */
class ResendOrderNotificationAdapter implements OrderNotificationAdapter {
  constructor(
    private readonly apiKey: string,
    private readonly to: string,
    private readonly from: string,
  ) {}

  async notifyNewOrder(order: Order): Promise<void> {
    const response = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${this.apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        from: this.from,
        to: this.to,
        subject: `Нове замовлення ${order.orderNumber} — ${formatMoneyText(order.total)}`,
        text: buildOrderSummaryText(order),
      }),
    });

    if (!response.ok) {
      throw new Error(`resend_order_notification_failed: ${response.status}`);
    }
  }
}

/** `1234.5` → `"1234.50 UAH"`. Money is integer minor units in the domain, so this only formats — it never re-computes a total. */
function formatMoneyText(value: Money): string {
  return `${moneyToDecimal(value).toFixed(2)} ${value.currency}`;
}

/** Human-readable delivery line — the discriminated union means each type has genuinely different fields, so it is spelled out rather than key-dumped. */
function formatDeliveryText(delivery: Order["deliveryMethod"]): string {
  switch (delivery.type) {
    case "novaPoshtaBranch":
      return `Нова Пошта, відділення — ${delivery.cityName}, №${delivery.branchNumber}`;
    case "novaPoshtaCourier":
      return `Нова Пошта, кур'єр — ${delivery.cityName}, ${delivery.address}`;
    case "courier":
      return `Кур'єр — ${delivery.cityName}, ${delivery.address}`;
    case "pickup":
      return `Самовивіз — ${delivery.stockistId}`;
  }
}

/**
 * Plain-text, staff-facing order summary. Every value is real,
 * already-persisted order data (the frozen `OrderLine` snapshot), nothing is
 * inferred or re-derived — this email must always agree with the admin panel.
 */
export function buildOrderSummaryText(order: Order): string {
  const lines: string[] = [
    `Замовлення: ${order.orderNumber}`,
    `Статус: ${order.status}`,
    "",
    `Клієнт: ${order.customer.fullName}`,
    `Телефон: ${order.customer.phone}`,
  ];

  if (order.customer.email) lines.push(`Email: ${order.customer.email}`);
  if (order.customer.companyName)
    lines.push(`Компанія: ${order.customer.companyName}`);

  lines.push("", `Доставка: ${formatDeliveryText(order.deliveryMethod)}`, "");
  lines.push("Позиції:");

  for (const line of order.lines) {
    const name = resolveLocaleContent(line.name, "uk");
    const options = line.options
      .map(
        (option) =>
          `${resolveLocaleContent(option.label, "uk")}: ${option.value}`,
      )
      .join(", ");
    lines.push(
      `  • ${name} (${line.sku})${options ? ` — ${options}` : ""} × ${line.quantity} = ${formatMoneyText(line.lineTotal)}`,
    );
  }

  lines.push("", `Разом: ${formatMoneyText(order.total)}`);

  if (order.notes) lines.push("", `Коментар клієнта: ${order.notes}`);

  return lines.join("\n");
}

let cachedAdapter: OrderNotificationAdapter | null = null;

/**
 * Resolves the configured adapter, falling back to the console one.
 *
 * The recipient is `ORDER_NOTIFICATION_EMAIL` when set, otherwise
 * `LEADS_NOTIFICATION_EMAIL` — so a deployment that already receives lead
 * notifications automatically starts receiving order notifications too,
 * while still allowing orders to be routed to a different inbox later.
 */
export function getOrderNotificationAdapter(): OrderNotificationAdapter {
  if (cachedAdapter) return cachedAdapter;

  const apiKey = process.env.RESEND_API_KEY;
  const to =
    process.env.ORDER_NOTIFICATION_EMAIL ??
    process.env.LEADS_NOTIFICATION_EMAIL;
  const from = process.env.EMAIL_FROM;

  cachedAdapter =
    apiKey && to && from
      ? new ResendOrderNotificationAdapter(apiKey, to, from)
      : new ConsoleOrderNotificationAdapter();
  return cachedAdapter;
}

/** Test-only escape hatch. */
export function __resetOrderNotificationAdapterForTests(): void {
  cachedAdapter = null;
}
