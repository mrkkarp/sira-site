import { describe, expect, it, beforeEach } from "vitest";
import { NextRequest } from "next/server";
import { HONEYPOT_FIELD } from "@/lib/forms/honeypot";
import { __resetRateLimitForTests } from "@/lib/forms/rate-limit";
import { POST } from "./route";

function makeRequest(body: unknown, headers: Record<string, string> = {}) {
  return new NextRequest("http://localhost:3000/api/newsletter", {
    method: "POST",
    headers: {
      host: "localhost:3000",
      "content-type": "application/json",
      ...headers,
    },
    body: JSON.stringify(body),
  });
}

describe("POST /api/newsletter", () => {
  beforeEach(() => {
    __resetRateLimitForTests();
  });

  it("accepts a valid email", async () => {
    const response = await POST(makeRequest({ email: "person@example.com" }));
    expect(await response.json()).toEqual({ ok: true });
  });

  it("rejects an invalid email", async () => {
    const response = await POST(makeRequest({ email: "not-an-email" }));
    expect(response.status).toBe(400);
  });

  it("pretends to succeed when the honeypot field is filled", async () => {
    const response = await POST(
      makeRequest({ email: "bot@example.com", [HONEYPOT_FIELD]: "spam" }),
    );
    expect(await response.json()).toEqual({ ok: true });
  });

  it("rejects cross-origin requests", async () => {
    const response = await POST(
      makeRequest(
        { email: "person@example.com" },
        { origin: "https://evil.example" },
      ),
    );
    expect(response.status).toBe(403);
  });
});
