import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { z } from "zod";
import { getLeadRepository } from "@/repositories/lead-repository";
import { getLeadNotificationAdapter } from "@/lib/email/lead-notification-adapter";
import { isHoneypotTripped } from "@/lib/forms/honeypot";
import { isRateLimited, clientKeyFromRequest } from "@/lib/forms/rate-limit";
import { isSameOriginRequest } from "@/lib/forms/verify-same-origin";
import { localeAndSourcePathFromReferer } from "@/lib/forms/request-context";
import { logFormSubmission } from "@/lib/forms/log-lead-submission";

export type CallbackRequestResponse =
  | { ok: true }
  | {
      ok: false;
      error: "invalid_input" | "rate_limited" | "server_error";
      detail?: string;
    };

/**
 * "Замовити дзвінок" (footer callback request) endpoint — Phase E.
 * Persists a real `callback`-type `LeadRequest` via `LeadRepository`
 * (Payload/Postgres) and notifies staff through `LeadNotificationAdapter`,
 * replacing the earlier mock that always "succeeded" without saving
 * anything. Validation is intentionally a small route-local schema (not
 * the full `CallbackRequestSchema` from `@/domain/leads/callback-request`)
 * because the client only ever supplies the *public* fields — `status`/
 * `locale`/`sourcePath`/audit fields are all derived here, server-side;
 * the full domain schema is still the source of truth and gets applied
 * one layer down, inside `PayloadLeadRepository`, when the stored
 * document round-trips back through `mapPayloadLeadToDomain`.
 */
const CallbackFormInput = z.object({
  name: z.string().trim().min(1),
  // Loose on purpose — real phone formats vary (+380, 0-prefixed, spaced);
  // this only guards against empty/garbage input, not strict E.164.
  phone: z.string().trim().min(7),
  preferredTime: z.string().trim().min(1).optional(),
});

export async function POST(request: NextRequest) {
  if (!isSameOriginRequest(request)) {
    return NextResponse.json(
      { ok: false, error: "invalid_input" } satisfies CallbackRequestResponse,
      { status: 403 },
    );
  }

  if (isRateLimited(`callback:${clientKeyFromRequest(request)}`)) {
    logFormSubmission({ form: "callback", outcome: "rejected_rate_limited" });
    return NextResponse.json(
      { ok: false, error: "rate_limited" } satisfies CallbackRequestResponse,
      { status: 429 },
    );
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json(
      { ok: false, error: "invalid_input" } satisfies CallbackRequestResponse,
      { status: 400 },
    );
  }

  if (
    typeof body === "object" &&
    body !== null &&
    isHoneypotTripped(body as Record<string, unknown>)
  ) {
    logFormSubmission({ form: "callback", outcome: "rejected_honeypot" });
    return NextResponse.json({ ok: true } satisfies CallbackRequestResponse);
  }

  const { locale, sourcePath } = localeAndSourcePathFromReferer(
    request.headers.get("referer"),
  );

  const parsed = CallbackFormInput.safeParse(body);
  if (!parsed.success) {
    logFormSubmission({
      form: "callback",
      outcome: "rejected_invalid",
      locale,
      sourcePath,
    });
    return NextResponse.json(
      {
        ok: false,
        error: "invalid_input",
        detail:
          process.env.NODE_ENV === "development"
            ? parsed.error.message
            : undefined,
      } satisfies CallbackRequestResponse,
      { status: 400 },
    );
  }

  try {
    const repository = await getLeadRepository();
    const lead = await repository.create({
      type: "callback",
      status: "new",
      locale,
      sourcePath,
      name: parsed.data.name,
      phone: parsed.data.phone,
      preferredTime: parsed.data.preferredTime,
    });
    // Notifying staff must never fail the request: the lead is already
    // committed, so a Resend outage answering 500 would tell a customer
    // their enquiry failed when it didn't — they resubmit (duplicate
    // leads) or give up entirely. Logged loudly instead so the missed
    // notification is recoverable from the server log.
    try {
      await getLeadNotificationAdapter().notify(lead);
    } catch (notificationError) {
      console.error(
        `[callback] lead ${lead.id} was saved but the staff notification failed`,
        notificationError,
      );
    }
    logFormSubmission({
      form: "callback",
      outcome: "created",
      locale,
      sourcePath,
    });
    return NextResponse.json({ ok: true } satisfies CallbackRequestResponse);
  } catch (error) {
    logFormSubmission({
      form: "callback",
      outcome: "error",
      locale,
      sourcePath,
    });
    return NextResponse.json(
      {
        ok: false,
        error: "server_error",
        detail:
          process.env.NODE_ENV === "development" ? String(error) : undefined,
      } satisfies CallbackRequestResponse,
      { status: 500 },
    );
  }
}
