import { describe, expect, it } from "vitest";
import { MAX_PHOTO_BYTES, validatePhotoFile } from "./photo-upload";

describe("validatePhotoFile", () => {
  it("accepts a real-sized jpeg/png/webp photo", () => {
    expect(validatePhotoFile({ mimetype: "image/jpeg", size: 1024 })).toEqual({
      ok: true,
    });
    expect(validatePhotoFile({ mimetype: "image/png", size: 1024 })).toEqual({
      ok: true,
    });
    expect(validatePhotoFile({ mimetype: "image/webp", size: 1024 })).toEqual({
      ok: true,
    });
  });

  it("rejects a disallowed mime type", () => {
    expect(
      validatePhotoFile({ mimetype: "application/pdf", size: 1024 }),
    ).toEqual({
      ok: false,
      error: "invalid_type",
    });
    expect(validatePhotoFile({ mimetype: "image/avif", size: 1024 })).toEqual({
      ok: false,
      error: "invalid_type",
    });
  });

  it("rejects a file over the size cap", () => {
    expect(
      validatePhotoFile({ mimetype: "image/jpeg", size: MAX_PHOTO_BYTES + 1 }),
    ).toEqual({
      ok: false,
      error: "too_large",
    });
  });

  it("accepts a file exactly at the size cap", () => {
    expect(
      validatePhotoFile({ mimetype: "image/jpeg", size: MAX_PHOTO_BYTES }),
    ).toEqual({ ok: true });
  });

  it("checks type before size, so an oversized non-photo reports invalid_type", () => {
    expect(
      validatePhotoFile({
        mimetype: "application/pdf",
        size: MAX_PHOTO_BYTES + 1,
      }),
    ).toEqual({
      ok: false,
      error: "invalid_type",
    });
  });
});
