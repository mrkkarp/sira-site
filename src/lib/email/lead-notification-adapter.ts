import "server-only";
import type { LeadRequest } from "@/domain/leads/lead-request";
import {
  resolveStaffEmailConfig,
  sendStaffEmail,
  type StaffEmailConfig,
} from "./staff-email";

/**
 * Adapter for notifying ODUDLAB staff about a new lead (Prompt 8 §8 —
 * "adapter для майбутньої email/CRM інтеграції"). One narrow interface so
 * the forms API never depends on a specific provider; swapping providers
 * or adding a CRM push later means adding a new class here, not touching
 * any route.
 */
export interface LeadNotificationAdapter {
  notify(lead: LeadRequest): Promise<void>;
}

/**
 * Dev/no-config fallback — logs that a notification *would* have been
 * sent, without ever touching a real inbox. This is what runs whenever
 * `RESEND_API_KEY` (or the recipient/from address) isn't configured, so
 * the forms API works end-to-end in local dev with zero setup.
 */
class ConsoleLeadNotificationAdapter implements LeadNotificationAdapter {
  async notify(lead: LeadRequest): Promise<void> {
    console.info(
      `[lead-notification] console adapter — new "${lead.type}" lead ${lead.id} (no email provider configured)`,
    );
  }
}

/** Real adapter, sending through the shared Resend sender. */
class ResendLeadNotificationAdapter implements LeadNotificationAdapter {
  constructor(private readonly config: StaffEmailConfig) {}

  async notify(lead: LeadRequest): Promise<void> {
    await sendStaffEmail({
      config: this.config,
      subject: `Нова заявка (${lead.type}): ${lead.name}`,
      text: buildLeadSummaryText(lead),
      failureCode: "resend_notification_failed",
    });
  }
}

/** Plain-text staff-facing summary — every field is real, already-collected data, nothing inferred. */
function buildLeadSummaryText(lead: LeadRequest): string {
  const lines = [
    `Тип заявки: ${lead.type}`,
    `Ім'я: ${lead.name}`,
    `Телефон: ${lead.phone}`,
  ];

  switch (lead.type) {
    case "contact":
      if (lead.email) lines.push(`Email: ${lead.email}`);
      lines.push(`Повідомлення: ${lead.message}`);
      break;
    case "callback":
      if (lead.preferredTime) lines.push(`Бажаний час: ${lead.preferredTime}`);
      break;
    case "quote":
      if (lead.email) lines.push(`Email: ${lead.email}`);
      if (lead.productId) lines.push(`Товар: ${lead.productId}`);
      if (lead.variantId) lines.push(`Варіант: ${lead.variantId}`);
      if (lead.quantity) lines.push(`Кількість: ${lead.quantity}`);
      lines.push(`Повідомлення: ${lead.message}`);
      break;
    case "designer":
      lines.push(`Email: ${lead.email}`);
      if (lead.companyName) lines.push(`Компанія: ${lead.companyName}`);
      if (lead.portfolioUrl) lines.push(`Портфоліо: ${lead.portfolioUrl}`);
      if (lead.message) lines.push(`Повідомлення: ${lead.message}`);
      break;
    case "warranty":
      if (lead.email) lines.push(`Email: ${lead.email}`);
      if (lead.orderNumber) lines.push(`Номер замовлення: ${lead.orderNumber}`);
      lines.push(`Опис проблеми: ${lead.issueDescription}`);
      break;
    case "sample":
      if (lead.email) lines.push(`Email: ${lead.email}`);
      lines.push(`Адреса: ${lead.address}`);
      break;
  }

  if (lead.sourcePath) lines.push(`Сторінка: ${lead.sourcePath}`);
  return lines.join("\n");
}

let cachedAdapter: LeadNotificationAdapter | null = null;

export function getLeadNotificationAdapter(): LeadNotificationAdapter {
  if (cachedAdapter) return cachedAdapter;

  const config = resolveStaffEmailConfig();
  cachedAdapter = config
    ? new ResendLeadNotificationAdapter(config)
    : new ConsoleLeadNotificationAdapter();
  return cachedAdapter;
}

/** Test-only escape hatch. */
export function __resetLeadNotificationAdapterForTests(): void {
  cachedAdapter = null;
}
