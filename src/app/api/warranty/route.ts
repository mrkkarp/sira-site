import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { z } from "zod";
import { ProductId, MediaId } from "@/domain/shared/ids";
import { getLeadRepository } from "@/repositories/lead-repository";
import { getLeadNotificationAdapter } from "@/lib/email/lead-notification-adapter";
import { isHoneypotTripped } from "@/lib/forms/honeypot";
import { isRateLimited, clientKeyFromRequest } from "@/lib/forms/rate-limit";
import { isSameOriginRequest } from "@/lib/forms/verify-same-origin";
import { localeAndSourcePathFromReferer } from "@/lib/forms/request-context";
import { logFormSubmission } from "@/lib/forms/log-lead-submission";
import { MAX_WARRANTY_PHOTOS } from "@/lib/forms/photo-upload";

export type WarrantyRequestResponse =
  | { ok: true }
  | {
      ok: false;
      error: "invalid_input" | "rate_limited" | "server_error";
      detail?: string;
    };

/**
 * Warranty-claim submission endpoint (Phase I), mirroring `/api/quote`'s
 * shape exactly. `photoIds` are real `media` document ids, already
 * uploaded one-by-one via `/api/warranty/upload` (the client form calls
 * that first, per selected photo, then submits the collected ids here) —
 * this route never receives raw file bytes itself, matching the domain
 * `WarrantyRequestSchema`'s `photoIds: MediaId[]` shape, which the
 * repository layer (`lead-repository.payload.ts`) already maps end to
 * end with zero changes needed for this phase.
 */
const WarrantyFormInput = z.object({
  name: z.string().trim().min(1),
  phone: z.string().trim().min(7),
  email: z.string().trim().email().optional(),
  orderNumber: z.string().trim().min(1).optional(),
  productId: ProductId.optional(),
  issueDescription: z.string().trim().min(1),
  photoIds: z.array(MediaId).max(MAX_WARRANTY_PHOTOS).optional(),
});

export async function POST(request: NextRequest) {
  if (!isSameOriginRequest(request)) {
    return NextResponse.json(
      { ok: false, error: "invalid_input" } satisfies WarrantyRequestResponse,
      { status: 403 },
    );
  }

  if (isRateLimited(`warranty:${clientKeyFromRequest(request)}`)) {
    logFormSubmission({ form: "warranty", outcome: "rejected_rate_limited" });
    return NextResponse.json(
      { ok: false, error: "rate_limited" } satisfies WarrantyRequestResponse,
      { status: 429 },
    );
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json(
      { ok: false, error: "invalid_input" } satisfies WarrantyRequestResponse,
      { status: 400 },
    );
  }

  if (
    typeof body === "object" &&
    body !== null &&
    isHoneypotTripped(body as Record<string, unknown>)
  ) {
    logFormSubmission({ form: "warranty", outcome: "rejected_honeypot" });
    return NextResponse.json({ ok: true } satisfies WarrantyRequestResponse);
  }

  const { locale, sourcePath } = localeAndSourcePathFromReferer(
    request.headers.get("referer"),
  );

  const parsed = WarrantyFormInput.safeParse(body);
  if (!parsed.success) {
    logFormSubmission({
      form: "warranty",
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
      } satisfies WarrantyRequestResponse,
      { status: 400 },
    );
  }

  try {
    const repository = await getLeadRepository();
    const lead = await repository.create({
      type: "warranty",
      status: "new",
      locale,
      sourcePath,
      name: parsed.data.name,
      phone: parsed.data.phone,
      email: parsed.data.email,
      orderNumber: parsed.data.orderNumber,
      productId: parsed.data.productId,
      issueDescription: parsed.data.issueDescription,
      photoIds: parsed.data.photoIds,
    });
    await getLeadNotificationAdapter().notify(lead);
    logFormSubmission({
      form: "warranty",
      outcome: "created",
      locale,
      sourcePath,
    });
    return NextResponse.json({ ok: true } satisfies WarrantyRequestResponse);
  } catch (error) {
    logFormSubmission({
      form: "warranty",
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
      } satisfies WarrantyRequestResponse,
      { status: 500 },
    );
  }
}
