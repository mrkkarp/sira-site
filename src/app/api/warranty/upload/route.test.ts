// @vitest-environment node
//
// Node's native `Request#formData()` multipart parser (used by
// `NextRequest`) and jsdom's `File`/`Blob`/`FormData` globals (this
// project's default test environment) don't recognize each other's
// brands, which trips an internal webidl assertion inside Node's
// bundled undici multipart parser for *any* multipart body — even a
// hand-built one with no jsdom objects involved at all. Running this
// file under the plain "node" environment instead of jsdom sidesteps
// that conflict entirely and is also the more faithful environment for
// a server-only route handler with no DOM dependency.
import { describe, expect, it, vi, beforeEach } from "vitest";
import { NextRequest } from "next/server";
import { __resetRateLimitForTests } from "@/lib/forms/rate-limit";
import { POST } from "./route";

const createMock = vi.fn();

vi.mock("@/lib/payload-client", () => ({
  getPayloadClient: async () => ({ create: createMock }),
}));

/**
 * Builds a raw `multipart/form-data` body by hand rather than via the
 * global `FormData`/`File` constructors: jsdom's `File` (this suite's
 * test environment) and the undici `FormData` that `NextRequest` parses
 * with don't recognize each other's `File` instances, so
 * `FormData#set(name, file)` throws a webidl validation error in this
 * environment even though it works fine at runtime in Node. Constructing
 * the wire format directly sidesteps that mismatch and is arguably a
 * more faithful test of what a real browser multipart upload looks like.
 */
function makeMultipartRequest(
  fieldName: string,
  file: { name: string; type: string; bytes: number[] } | null,
  headers: Record<string, string> = {},
) {
  const boundary = "----warrantyTestBoundary";
  let body = "";
  if (file) {
    body += `--${boundary}\r\n`;
    body += `Content-Disposition: form-data; name="${fieldName}"; filename="${file.name}"\r\n`;
    body += `Content-Type: ${file.type}\r\n\r\n`;
    body += String.fromCharCode(...file.bytes);
    body += `\r\n`;
  }
  body += `--${boundary}--\r\n`;

  return new NextRequest("http://localhost:3000/api/warranty/upload", {
    method: "POST",
    headers: {
      host: "localhost:3000",
      "content-type": `multipart/form-data; boundary=${boundary}`,
      ...headers,
    },
    body,
  });
}

describe("POST /api/warranty/upload", () => {
  beforeEach(() => {
    __resetRateLimitForTests();
    createMock.mockReset();
    createMock.mockResolvedValue({ id: 99 });
  });

  it("uploads a real photo to the media collection and returns its id", async () => {
    const response = await POST(
      makeMultipartRequest("photo", {
        name: "crack.jpg",
        type: "image/jpeg",
        bytes: [1, 2, 3],
      }),
    );
    const json = await response.json();

    expect(json).toEqual({ ok: true, id: "99" });
    expect(createMock).toHaveBeenCalledWith(
      expect.objectContaining({
        collection: "media",
        overrideAccess: true,
        file: expect.objectContaining({
          mimetype: "image/jpeg",
          name: "crack.jpg",
        }),
      }),
    );
  });

  it("rejects a disallowed file type without touching Payload", async () => {
    const response = await POST(
      makeMultipartRequest("photo", {
        name: "claim.pdf",
        type: "application/pdf",
        bytes: [1, 2, 3],
      }),
    );
    const json = await response.json();

    expect(response.status).toBe(400);
    expect(json).toEqual({ ok: false, error: "invalid_type" });
    expect(createMock).not.toHaveBeenCalled();
  });

  it("rejects a request with no file field", async () => {
    const response = await POST(makeMultipartRequest("photo", null));
    expect(response.status).toBe(400);
    expect(createMock).not.toHaveBeenCalled();
  });

  it("rejects a cross-origin request", async () => {
    const response = await POST(
      makeMultipartRequest(
        "photo",
        { name: "crack.jpg", type: "image/jpeg", bytes: [1, 2, 3] },
        { origin: "https://evil.example" },
      ),
    );
    expect(response.status).toBe(403);
    expect(createMock).not.toHaveBeenCalled();
  });
});
