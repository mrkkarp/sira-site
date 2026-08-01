import "server-only";

/**
 * The one place an outbound staff email is actually sent.
 *
 * Three separate paths notify ODUDLAB staff — new leads
 * (`lead-notification-adapter.ts`), new orders
 * (`order-notification-adapter.ts`) and newsletter subscriptions
 * (`/api/newsletter`) — and each one had, or would have had, its own copy
 * of the same Resend POST. Copies drift: a header fixed in one, a timeout
 * added to another, and the path nobody tested silently stops delivering.
 * They share this instead, and keep only their own subject/body and their
 * own failure code.
 */

export interface StaffEmailConfig {
  apiKey: string;
  to: string;
  from: string;
}

/**
 * Resolves the Resend configuration, or `null` when this deploy has no
 * email provider set up — in which case every caller falls back to logging
 * rather than throwing, so the whole site still works in local dev with
 * zero setup.
 *
 * `recipient` lets a caller route to a purpose-specific inbox (orders vs
 * leads); it falls back to `LEADS_NOTIFICATION_EMAIL` so a deployment that
 * already receives leads automatically receives everything else too.
 */
export function resolveStaffEmailConfig(
  recipient?: string,
): StaffEmailConfig | null {
  const apiKey = process.env.RESEND_API_KEY;
  const to = recipient ?? process.env.LEADS_NOTIFICATION_EMAIL;
  const from = process.env.EMAIL_FROM;
  if (!apiKey || !to || !from) return null;
  return { apiKey, to, from };
}

/**
 * POSTs one plain-text email through Resend's HTTP API (no SDK needed for
 * a single endpoint).
 *
 * `failureCode` is thrown on a non-2xx response so each caller keeps its
 * own stable, greppable identifier in logs and tests rather than sharing
 * one generic message.
 */
export async function sendStaffEmail(params: {
  config: StaffEmailConfig;
  subject: string;
  text: string;
  failureCode: string;
}): Promise<void> {
  const { config, subject, text, failureCode } = params;
  const response = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${config.apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      from: config.from,
      to: config.to,
      subject,
      text,
    }),
  });

  if (!response.ok) {
    throw new Error(`${failureCode}: ${response.status}`);
  }
}
