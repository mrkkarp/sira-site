import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { getPayloadClient } from "@/lib/payload-client";
import { validatePhotoFile } from "@/lib/forms/photo-upload";
import { isRateLimited, clientKeyFromRequest } from "@/lib/forms/rate-limit";
import { isSameOriginRequest } from "@/lib/forms/verify-same-origin";
import { logFormSubmission } from "@/lib/forms/log-lead-submission";

export type WarrantyPhotoUploadResponse =
  | { ok: true; id: string }
  | {
      ok: false;
      error:
        | "invalid_input"
        | "invalid_type"
        | "too_large"
        | "rate_limited"
        | "server_error";
      detail?: string;
    };

/**
 * Warranty-claim photo upload (Phase I — file upload), one file per
 * request — the client form calls this once per selected photo so it can
 * show per-photo progress/errors, then collects the returned `id`s into
 * `photoIds` for the real `/api/warranty` submission.
 *
 * Unlike the JSON lead endpoints, this is `multipart/form-data`, a
 * CORS-safelisted "simple request" content type that never forces a
 * preflight — so the `Content-Type` guard `isSameOriginRequest()`'s own
 * doc comment leans on doesn't apply here. The explicit `Origin`/`Host`
 * check below is this route's only real CSRF guard, not a redundant
 * second layer.
 *
 * Writes to the `media` collection with `overrideAccess: true`, the same
 * pattern the Horoshop importer uses for programmatic photo uploads
 * (`horoshop-import-service.ts`) — `Media`'s own `create` access is
 * admin-only, so a public customer upload must bypass it deliberately,
 * not be granted broader collection access.
 */
export async function POST(request: NextRequest) {
  if (!isSameOriginRequest(request)) {
    return NextResponse.json(
      {
        ok: false,
        error: "invalid_input",
      } satisfies WarrantyPhotoUploadResponse,
      { status: 403 },
    );
  }

  if (isRateLimited(`warranty-upload:${clientKeyFromRequest(request)}`)) {
    logFormSubmission({
      form: "warranty-upload",
      outcome: "rejected_rate_limited",
    });
    return NextResponse.json(
      {
        ok: false,
        error: "rate_limited",
      } satisfies WarrantyPhotoUploadResponse,
      { status: 429 },
    );
  }

  let form: FormData;
  try {
    form = await request.formData();
  } catch {
    return NextResponse.json(
      {
        ok: false,
        error: "invalid_input",
      } satisfies WarrantyPhotoUploadResponse,
      { status: 400 },
    );
  }

  // Duck-typed rather than `instanceof File`: Next's `formData()` parsing
  // and the runtime's own `File` global don't always share a prototype
  // chain (e.g. across the fetch polyfill used in tests), so an identity
  // check here would reject genuine uploads.
  const file = form.get("photo");
  const isFileLike =
    typeof file === "object" &&
    file !== null &&
    typeof (file as { arrayBuffer?: unknown }).arrayBuffer === "function" &&
    typeof (file as { type?: unknown }).type === "string" &&
    typeof (file as { size?: unknown }).size === "number" &&
    typeof (file as { name?: unknown }).name === "string";
  if (!isFileLike) {
    return NextResponse.json(
      {
        ok: false,
        error: "invalid_input",
      } satisfies WarrantyPhotoUploadResponse,
      { status: 400 },
    );
  }
  const photoFile = file as File;

  const validation = validatePhotoFile({
    mimetype: photoFile.type,
    size: photoFile.size,
  });
  if (!validation.ok) {
    logFormSubmission({ form: "warranty-upload", outcome: "rejected_invalid" });
    return NextResponse.json(
      {
        ok: false,
        error: validation.error,
      } satisfies WarrantyPhotoUploadResponse,
      { status: 400 },
    );
  }

  try {
    const arrayBuffer = await photoFile.arrayBuffer();
    const payload = await getPayloadClient();
    const media = await payload.create({
      collection: "media",
      overrideAccess: true,
      // A customer photographing their own installed piece — always a
      // photograph, never a technical drawing.
      data: { alt: "", kind: "photo" },
      file: {
        data: Buffer.from(arrayBuffer),
        mimetype: photoFile.type,
        name: photoFile.name || "warranty-photo.jpg",
        size: photoFile.size,
      },
    });
    logFormSubmission({ form: "warranty-upload", outcome: "created" });
    return NextResponse.json({
      ok: true,
      id: String(media.id),
    } satisfies WarrantyPhotoUploadResponse);
  } catch (error) {
    logFormSubmission({ form: "warranty-upload", outcome: "error" });
    return NextResponse.json(
      {
        ok: false,
        error: "server_error",
        detail:
          process.env.NODE_ENV === "development" ? String(error) : undefined,
      } satisfies WarrantyPhotoUploadResponse,
      { status: 500 },
    );
  }
}
