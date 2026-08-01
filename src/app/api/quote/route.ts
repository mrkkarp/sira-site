import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { z } from "zod";
import { ProductId, VariantId } from "@/domain/shared/ids";
import { getLeadRepository } from "@/repositories/lead-repository";
import { getLeadNotificationAdapter } from "@/lib/email/lead-notification-adapter";
import { isHoneypotTripped } from "@/lib/forms/honeypot";
import { isRateLimited, clientKeyFromRequest } from "@/lib/forms/rate-limit";
import { isSameOriginRequest } from "@/lib/forms/verify-same-origin";
import { localeAndSourcePathFromReferer } from "@/lib/forms/request-context";
import { logFormSubmission } from "@/lib/forms/log-lead-submission";

export type QuoteRequestResponse =
  | { ok: true }
  | {
      ok: false;
      error: "invalid_input" | "rate_limited" | "server_error";
      detail?: string;
    };

/**
 * "Отримати прорахунок" (product-page quote request) endpoint — Phase E.
 * Previously shared the footer's mock `/api/callback` route and only
 * carried a flattened `context` string; now a `quote`-type `LeadRequest`
 * in its own right, carrying the real selected `productId`/`variantId`
 * (see `src/components/product/quote-request-form.tsx`) so staff — and
 * any future CRM integration — get the structured reference, not just
 * prose. `message` still carries that same real, non-fabricated
 * product/variant summary (`buildQuoteContext`), satisfying the domain
 * schema's required `message` without inventing a second free-text field
 * in the UI.
 */
const QuoteFormInput = z.object({
  name: z.string().trim().min(1),
  phone: z.string().trim().min(7),
  message: z.string().trim().min(1),
  productId: ProductId.optional(),
  variantId: VariantId.optional(),
  quantity: z.number().int().positive().optional(),
});

export async function POST(request: NextRequest) {
  if (!isSameOriginRequest(request)) {
    return NextResponse.json(
      { ok: false, error: "invalid_input" } satisfies QuoteRequestResponse,
      { status: 403 },
    );
  }

  if (isRateLimited(`quote:${clientKeyFromRequest(request)}`)) {
    logFormSubmission({ form: "quote", outcome: "rejected_rate_limited" });
    return NextResponse.json(
      { ok: false, error: "rate_limited" } satisfies QuoteRequestResponse,
      { status: 429 },
    );
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json(
      { ok: false, error: "invalid_input" } satisfies QuoteRequestResponse,
      { status: 400 },
    );
  }

  if (
    typeof body === "object" &&
    body !== null &&
    isHoneypotTripped(body as Record<string, unknown>)
  ) {
    logFormSubmission({ form: "quote", outcome: "rejected_honeypot" });
    return NextResponse.json({ ok: true } satisfies QuoteRequestResponse);
  }

  const { locale, sourcePath } = localeAndSourcePathFromReferer(
    request.headers.get("referer"),
  );

  const parsed = QuoteFormInput.safeParse(body);
  if (!parsed.success) {
    logFormSubmission({
      form: "quote",
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
      } satisfies QuoteRequestResponse,
      { status: 400 },
    );
  }

  try {
    const repository = await getLeadRepository();
    const lead = await repository.create({
      type: "quote",
      status: "new",
      locale,
      sourcePath,
      name: parsed.data.name,
      phone: parsed.data.phone,
      productId: parsed.data.productId,
      variantId: parsed.data.variantId,
      quantity: parsed.data.quantity,
      message: parsed.data.message,
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
        `[quote] lead ${lead.id} was saved but the staff notification failed`,
        notificationError,
      );
    }
    logFormSubmission({
      form: "quote",
      outcome: "created",
      locale,
      sourcePath,
    });
    return NextResponse.json({ ok: true } satisfies QuoteRequestResponse);
  } catch (error) {
    logFormSubmission({ form: "quote", outcome: "error", locale, sourcePath });
    return NextResponse.json(
      {
        ok: false,
        error: "server_error",
        detail:
          process.env.NODE_ENV === "development" ? String(error) : undefined,
      } satisfies QuoteRequestResponse,
      { status: 500 },
    );
  }
}
