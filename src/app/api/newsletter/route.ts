import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { NewsletterSubscribeSchema } from "@/lib/schemas/newsletter";
import { isHoneypotTripped } from "@/lib/forms/honeypot";
import { isRateLimited, clientKeyFromRequest } from "@/lib/forms/rate-limit";
import { isSameOriginRequest } from "@/lib/forms/verify-same-origin";
import { logFormSubmission } from "@/lib/forms/log-lead-submission";

export type NewsletterSubscribeResponse =
  | { ok: true }
  | { ok: false; error: "invalid_email" | "rate_limited" | "server_error" };

/**
 * Mock subscribe endpoint. A newsletter subscription isn't one of the six
 * `LeadRequest` types (Prompt 8 §12) — it's not a sales lead, so it
 * deliberately does NOT go through `LeadRepository`/`Leads`. No email-
 * marketing provider is connected yet — this still validates input and
 * "succeeds" so the UI/UX (loading, success, error states) can be built
 * and tested end-to-end now. Swap the body of the `try` block for a real
 * Mailchimp / Klaviyo (or similar) API call once credentials exist; the
 * request/response shape here is already what that integration would
 * need. The honeypot/rate-limit/same-origin hardening below applies
 * regardless, since this is still a public, unauthenticated POST route.
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

  // TODO(integration): call the real ESP here, e.g.
  //   await mailchimp.lists.addListMember(LIST_ID, { email_address: parsed.data.email, status: "pending" });
  // and map provider errors to { ok: false, error: "server_error" }.

  logFormSubmission({ form: "newsletter", outcome: "created" });
  return NextResponse.json({ ok: true } satisfies NewsletterSubscribeResponse);
}
