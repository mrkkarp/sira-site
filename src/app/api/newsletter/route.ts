import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { NewsletterSubscribeSchema } from "@/lib/schemas/newsletter";
import { isHoneypotTripped } from "@/lib/forms/honeypot";
import { isRateLimited, clientKeyFromRequest } from "@/lib/forms/rate-limit";
import { isSameOriginRequest } from "@/lib/forms/verify-same-origin";
import { logFormSubmission } from "@/lib/forms/log-lead-submission";
import {
  resolveStaffEmailConfig,
  sendStaffEmail,
} from "@/lib/email/staff-email";

export type NewsletterSubscribeResponse =
  | { ok: true }
  | { ok: false; error: "invalid_email" | "rate_limited" | "server_error" };

/**
 * Newsletter subscribe endpoint. A subscription isn't one of the six
 * `LeadRequest` types (Prompt 8 §12) — it's not a sales lead, so it
 * deliberately does NOT go through `LeadRepository`/`Leads`, and adding a
 * seventh lead type would put every subscriber into the staff triage
 * queue.
 *
 * No email-marketing provider is connected yet, so the subscription is
 * emailed to staff (and logged) rather than pushed to a list. That is a
 * deliberate stopgap, not a mock: the footer form is on every page, and an
 * endpoint that answers "success" while discarding the address is worse
 * than one that fails loudly. Replace the `sendStaffEmail` call with the
 * real ESP call (e.g. `mailchimp.lists.addListMember(LIST_ID, {
 * email_address, status: "pending" })`) once credentials exist — the
 * request/response shape here is already what that integration needs.
 *
 * The honeypot/rate-limit/same-origin hardening applies regardless, since
 * this is a public, unauthenticated POST route.
 */
export async function POST(request: NextRequest) {
  if (!isSameOriginRequest(request)) {
    return NextResponse.json(
      {
        ok: false,
        error: "invalid_email",
      } satisfies NewsletterSubscribeResponse,
      { status: 403 },
    );
  }

  if (isRateLimited(`newsletter:${clientKeyFromRequest(request)}`)) {
    logFormSubmission({ form: "newsletter", outcome: "rejected_rate_limited" });
    return NextResponse.json(
      {
        ok: false,
        error: "rate_limited",
      } satisfies NewsletterSubscribeResponse,
      { status: 429 },
    );
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json(
      {
        ok: false,
        error: "invalid_email",
      } satisfies NewsletterSubscribeResponse,
      { status: 400 },
    );
  }

  if (
    typeof body === "object" &&
    body !== null &&
    isHoneypotTripped(body as Record<string, unknown>)
  ) {
    logFormSubmission({ form: "newsletter", outcome: "rejected_honeypot" });
    return NextResponse.json({
      ok: true,
    } satisfies NewsletterSubscribeResponse);
  }

  const parsed = NewsletterSubscribeSchema.safeParse(body);
  if (!parsed.success) {
    logFormSubmission({ form: "newsletter", outcome: "rejected_invalid" });
    return NextResponse.json(
      {
        ok: false,
        error: "invalid_email",
      } satisfies NewsletterSubscribeResponse,
      { status: 400 },
    );
  }

  // Until an ESP is connected, the subscription is emailed to staff so the
  // address is captured *somewhere real*. It used to be dropped on the
  // floor while the footer form still answered "success" — a person gave
  // consent and their address, and nothing anywhere recorded it.
  //
  // Wrapped so a Resend outage can't 500 a subscription: unlike an order
  // there is nothing to recover, but telling someone their subscription
  // failed when the only thing that failed was our own notification is
  // still the wrong answer. The console fallback keeps the address in the
  // server log either way.
  try {
    const config = resolveStaffEmailConfig();
    if (config) {
      await sendStaffEmail({
        config,
        subject: `Нова підписка на розсилку: ${parsed.data.email}`,
        text: `Email: ${parsed.data.email}`,
        failureCode: "resend_newsletter_notification_failed",
      });
    } else {
      console.info(
        `[newsletter] console adapter — new subscription ${parsed.data.email} (no email provider configured)`,
      );
    }
  } catch (notificationError) {
    console.error(
      `[newsletter] subscription ${parsed.data.email} was accepted but the staff notification failed`,
      notificationError,
    );
  }

  logFormSubmission({ form: "newsletter", outcome: "created" });
  return NextResponse.json({ ok: true } satisfies NewsletterSubscribeResponse);
}
