import "server-only";
import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import type { z } from "zod";
import { getLeadRepository, type NewLeadRequest } from "@/repositories/lead-repository";
import { getLeadNotificationAdapter } from "@/lib/email/lead-notification-adapter";
import { isHoneypotTripped } from "@/lib/forms/honeypot";
import { isRateLimited, clientKeyFromRequest } from "@/lib/forms/rate-limit";
import { isSameOriginRequest } from "@/lib/forms/verify-same-origin";
import { localeAndSourcePathFromReferer } from "@/lib/forms/request-context";
import { logFormSubmission } from "@/lib/forms/log-lead-submission";
import { eventIdFromBody } from "@/lib/forms/event-id";
import { reportLeadToMetaAfterResponse } from "@/lib/analytics/meta/lead-event";
import type { Locale } from "@/i18n/config";
import type { LeadRequest } from "@/domain/leads/lead-request";

/**
 * The pipeline every public lead endpoint runs, in one place.
 *
 * `/api/quote` and `/api/warranty` each spell it out inline, which was fine
 * when there were two. There are five now, and the steps that matter are the
 * ones easiest to leave out by accident: the same-origin check, the rate
 * limit, the honeypot's *fake* success, and the rule that a failed staff
 * notification must not fail the request. A copy that omits one of those does
 * not look broken — it looks like a working endpoint that happens to accept
 * bot submissions, or that tells a real customer their enquiry failed after it
 * was already saved. Writing the order once means a new form cannot get it
 * subtly wrong; it can only fail to use this function at all, which is
 * visible in review.
 *
 * The two existing routes are deliberately left as they are. Rewriting a
 * working, tested endpoint to prove a point about abstraction is how working
 * endpoints stop working — `/api/warranty` in particular has its own
 * media-upload concerns that do not belong here.
 */

export type LeadEndpointResponse =
  | { ok: true }
  | {
      ok: false;
      error: "invalid_input" | "rate_limited" | "server_error";
      detail?: string;
    };

/**
 * The three fields Meta can match a person on, pulled off whichever kind of
 * lead this turned out to be.
 *
 * `LeadRequest` is a discriminated union and its members disagree about which
 * of these exist — a quote has no email field at all, a contact's is optional —
 * so each is probed rather than read. Taken from the *stored* lead rather than
 * the request body so what gets hashed is exactly what the workshop will call.
 *
 * Everything here is plaintext and stays server-side: `buildMetaUserData`
 * hashes it before it goes anywhere.
 */
function leadContactDetails(lead: LeadRequest): {
  name?: string;
  email?: string;
  phone?: string;
} {
  const text = (key: "name" | "email" | "phone"): string | undefined => {
    const value = key in lead ? (lead as Record<string, unknown>)[key] : undefined;
    return typeof value === "string" && value ? value : undefined;
  };
  return { name: text("name"), email: text("email"), phone: text("phone") };
}

/** Only in development — a Zod message can name submitted values. */
function devDetail(detail: string): string | undefined {
  return process.env.NODE_ENV === "development" ? detail : undefined;
}

function jsonError(
  error: Exclude<LeadEndpointResponse, { ok: true }>["error"],
  status: number,
  detail?: string,
): NextResponse {
  return NextResponse.json(
    { ok: false, error, detail } satisfies LeadEndpointResponse,
    { status },
  );
}

export async function handleLeadSubmission<Schema extends z.ZodTypeAny>({
  request,
  form,
  schema,
  toLead,
  metaProduct,
}: {
  request: NextRequest;
  /** Rate-limit bucket and log label, e.g. `"contact"`. */
  form: string;
  schema: Schema;
  /**
   * Which product this lead is about, when the form knows of one, so the Meta
   * server event can carry that product's real price instead of the flat lead
   * value.
   *
   * Derived from the *validated* input rather than the raw body, and looked up
   * against the catalogue server-side — the price itself is never taken from
   * the request. Omit it for forms with no product behind them.
   */
  metaProduct?: (input: z.infer<Schema>) => {
    productSlug?: string;
    variantSku?: string;
  };
  /**
   * Turn the validated body into the lead to store. Takes the locale and
   * source path derived from the `Referer` rather than from the body: a
   * client-supplied "which page was I on" is a client-supplied fact, and this
   * one exists for staff context, so it should not be forgeable.
   */
  toLead: (
    input: z.infer<Schema>,
    context: { locale: Locale; sourcePath?: string },
  ) => NewLeadRequest;
}): Promise<NextResponse> {
  if (!isSameOriginRequest(request)) {
    logFormSubmission({ form, outcome: "rejected_origin" });
    return jsonError("invalid_input", 403);
  }

  if (isRateLimited(`${form}:${clientKeyFromRequest(request)}`)) {
    logFormSubmission({ form, outcome: "rejected_rate_limited" });
    return jsonError("rate_limited", 429);
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return jsonError("invalid_input", 400);
  }

  // Before validation, deliberately. A bot that also fails validation should
  // still get the honeypot's indistinguishable-from-success answer rather than
  // a 400 telling it which field it got wrong.
  if (
    typeof body === "object" &&
    body !== null &&
    isHoneypotTripped(body as Record<string, unknown>)
  ) {
    logFormSubmission({ form, outcome: "rejected_honeypot" });
    return NextResponse.json({ ok: true } satisfies LeadEndpointResponse);
  }

  const { locale, sourcePath } = localeAndSourcePathFromReferer(
    request.headers.get("referer"),
  );

  const parsed = schema.safeParse(body);
  if (!parsed.success) {
    logFormSubmission({ form, outcome: "rejected_invalid", locale, sourcePath });
    return jsonError("invalid_input", 400, devDetail(parsed.error.message));
  }

  try {
    const repository = await getLeadRepository();
    const lead = await repository.create(
      toLead(parsed.data, { locale, sourcePath }),
    );
    // Notifying staff must never fail the request: the lead is already
    // committed, so an email outage answering 500 would tell a customer their
    // enquiry failed when it did not — they resubmit (duplicate leads) or give
    // up entirely. Logged loudly instead, so the missed notification is
    // recoverable from the server log.
    try {
      await getLeadNotificationAdapter().notify(lead);
    } catch (notificationError) {
      console.error(
        `[${form}] lead ${lead.id} was saved but the staff notification failed`,
        notificationError,
      );
    }
    // The server copy of this conversion, for Meta's Conversions API. Runs
    // after the response and cannot fail the request — see
    // `reportLeadToMetaAfterResponse`. Deliberately last, and never in place of
    // the notification or the log: measurement is the least important thing
    // this endpoint does.
    reportLeadToMetaAfterResponse(request, {
      form,
      eventId: eventIdFromBody(body),
      ...leadContactDetails(lead),
      ...(metaProduct?.(parsed.data) ?? {}),
    });

    logFormSubmission({ form, outcome: "created", locale, sourcePath });
    return NextResponse.json({ ok: true } satisfies LeadEndpointResponse);
  } catch (error) {
    logFormSubmission({ form, outcome: "error", locale, sourcePath });
    return jsonError("server_error", 500, devDetail(String(error)));
  }
}
