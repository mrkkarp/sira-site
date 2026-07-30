import { describe, expect, it } from "vitest";
import { isSameOriginRequest } from "./verify-same-origin";

describe("isSameOriginRequest", () => {
  it("is false when there's no Host header at all", () => {
    const request = new Request("https://example.com");
    request.headers.delete("host");
    expect(isSameOriginRequest(request)).toBe(false);
  });

  it("is true when Origin is absent (common for same-origin fetches)", () => {
    const request = new Request("https://example.com", {
      headers: { host: "example.com" },
    });
    expect(isSameOriginRequest(request)).toBe(true);
  });

  it("is true when Origin's host matches Host", () => {
    const request = new Request("https://example.com", {
      headers: { host: "example.com", origin: "https://example.com" },
    });
    expect(isSameOriginRequest(request)).toBe(true);
  });

  it("is false when Origin's host doesn't match Host", () => {
    const request = new Request("https://example.com", {
      headers: { host: "example.com", origin: "https://evil.example" },
    });
    expect(isSameOriginRequest(request)).toBe(false);
  });

  it("is false when Origin is malformed", () => {
    const request = new Request("https://example.com", {
      headers: { host: "example.com", origin: "not-a-url" },
    });
    expect(isSameOriginRequest(request)).toBe(false);
  });
});
