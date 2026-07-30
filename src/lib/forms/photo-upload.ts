/**
 * Warranty-claim photo upload constraints (Phase I — file upload). Pure,
 * side-effect-free rules shared by the client form (`warranty-request-form.tsx`,
 * pre-flight rejection before spending an upload round-trip) and the
 * `/api/warranty/upload` route (the real enforcement point — client-side
 * checks are just UX, never trusted alone).
 *
 * Deliberately narrower than `Media`'s own collection-level
 * `mimeTypes` (`src/collections/Media.ts`, which also allows `image/avif`
 * and `application/pdf` for editorial uploads): a warranty claim is a
 * customer-taken photo of a defect, so only the three formats an actual
 * phone camera or a "save as" from a phone gallery would realistically
 * produce are accepted here — not the editorial team's full asset range.
 */
export const MAX_PHOTO_BYTES = 8 * 1024 * 1024; // 8MB — generous for a single phone photo, small enough to keep local disk storage sane.

export const ALLOWED_PHOTO_MIME_TYPES = [
  "image/jpeg",
  "image/png",
  "image/webp",
] as const;
export type AllowedPhotoMimeType = (typeof ALLOWED_PHOTO_MIME_TYPES)[number];

/** Matches `photoIds` being optional in `WarrantyRequestSchema` but bounded — a claim isn't a photo album. */
export const MAX_WARRANTY_PHOTOS = 5;

export type PhotoValidationError = "too_large" | "invalid_type";

export function validatePhotoFile(file: {
  mimetype: string;
  size: number;
}): { ok: true } | { ok: false; error: PhotoValidationError } {
  if (
    !ALLOWED_PHOTO_MIME_TYPES.includes(file.mimetype as AllowedPhotoMimeType)
  ) {
    return { ok: false, error: "invalid_type" };
  }
  if (file.size > MAX_PHOTO_BYTES) {
    return { ok: false, error: "too_large" };
  }
  return { ok: true };
}
