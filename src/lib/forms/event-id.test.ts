import { describe, expect, it } from "vitest";
import {
  EVENT_ID_FIELD,
  eventIdFromBody,
  newEventId,
} from "@/lib/forms/event-id";

describe("forms/event-id", () => {
  it("mints a different id every time", () => {
    // One id per submission, not per mount or per session. Two submissions
    // sharing one would make Meta discard the second as a duplicate of the
    // first — a lead that arrived and was never counted.
    const ids = new Set(Array.from({ length: 100 }, newEventId));
    expect(ids.size).toBe(100);
  });

  it("falls back to something usable without crypto.randomUUID", () => {
    // Only reachable on a plain-http origin or a very old browser. Losing the
    // id there would mean losing the server-side copy of the lead entirely.
    const original = globalThis.crypto;
    try {
      Object.defineProperty(globalThis, "crypto", {
        value: {},
        configurable: true,
      });
      const id = newEventId();
      expect(id.length).toBeGreaterThanOrEqual(8);
      expect(eventIdFromBody({ [EVENT_ID_FIELD]: id })).toBe(id);
    } finally {
      Object.defineProperty(globalThis, "crypto", {
        value: original,
        configurable: true,
      });
    }
  });

  it("reads the id back out of a body", () => {
    const id = newEventId();
    expect(eventIdFromBody({ [EVENT_ID_FIELD]: id })).toBe(id);
  });

  it("drops anything that is not a plausible id", () => {
    // The value is echoed into an outbound request to Meta and into server
    // logs. "It is only ever our own UUID" describes the client we shipped, not
    // the client that is posting.
    expect(eventIdFromBody({})).toBeUndefined();
    expect(eventIdFromBody(null)).toBeUndefined();
    expect(eventIdFromBody("nope")).toBeUndefined();
    expect(eventIdFromBody({ [EVENT_ID_FIELD]: 42 })).toBeUndefined();
    expect(eventIdFromBody({ [EVENT_ID_FIELD]: "short" })).toBeUndefined();
    expect(
      eventIdFromBody({ [EVENT_ID_FIELD]: "has spaces and <tags>" }),
    ).toBeUndefined();
    expect(
      eventIdFromBody({ [EVENT_ID_FIELD]: "x".repeat(129) }),
    ).toBeUndefined();
  });
});
