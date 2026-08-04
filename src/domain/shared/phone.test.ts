import { describe, expect, it } from "vitest";
import { PhoneNumber, phoneDigits } from "./phone";
import { isValidPhoneNumber } from "./phone-rule";

/** Everything either side is asked about below, in one list. */
const ALL_INPUTS = [
  "0501234567",
  "+380 50 123 45 67",
  "+380-50-123-45-67",
  "+38 (050) 123-45-67",
  "050.123.45.67",
  "  +380501234567  ",
  "2345678",
  "",
  "   ",
  "0",
  "12345",
  "+1234567890123456",
  "call me",
  "050 call me 123",
  "hello@example.com",
];

/**
 * `PhoneNumber` is the *one* phone rule — the client guards in the checkout,
 * warranty and quote forms and the server-side lead schemas all import this
 * same object. That is the point of it: before, the API accepted a single
 * "0" (`z.string().min(1)`) while the warranty form demanded seven
 * characters, so the two sides disagreed about the same field.
 *
 * These tests pin the two properties that matter and that are easy to break
 * later: it must reject input that can't be a phone number, and it must keep
 * accepting the messy-but-real formats Ukrainian customers actually type. A
 * validator that turns away a real buyer is far more expensive than one that
 * lets a typo through, so the "accepts" list is deliberately the longer one.
 */
describe("PhoneNumber", () => {
  it.each([
    ["plain national", "0501234567"],
    ["international, spaced", "+380 50 123 45 67"],
    ["international, dashed", "+380-50-123-45-67"],
    ["with an area code in brackets", "+38 (050) 123-45-67"],
    ["dotted", "050.123.45.67"],
    ["surrounding whitespace", "  +380501234567  "],
    // The lower bound, exactly: a city landline typed without its area
    // code. Anything shorter can't be dialled.
    ["a 7-digit local number", "2345678"],
  ])("accepts %s", (_label, value) => {
    expect(PhoneNumber.safeParse(value).success).toBe(true);
  });

  it.each([
    ["empty", ""],
    ["whitespace only", "   "],
    // The old server rule was `min(1)`, so this passed.
    ["a single digit", "0"],
    ["too few digits to dial", "12345"],
    ["longer than E.164 allows", "+1234567890123456"],
    ["letters", "call me"],
    ["a word mixed into digits", "050 call me 123"],
    ["an email in the phone box", "hello@example.com"],
  ])("rejects %s", (_label, value) => {
    expect(PhoneNumber.safeParse(value).success).toBe(false);
  });

  it("trims, but otherwise hands back exactly what was typed", () => {
    // Formatting is the customer's business — we count digits, we don't
    // rewrite their number into a house style.
    expect(PhoneNumber.parse("  +380 (50) 123-45-67 ")).toBe(
      "+380 (50) 123-45-67",
    );
  });
});

describe("the client rule and the server schema", () => {
  it.each(ALL_INPUTS)("agree about %j", (value) => {
    // The rule lives in `phone-rule.ts` (no dependencies, so the browser can
    // use it) and `PhoneNumber` wraps it for the API. That split is exactly
    // how the *original* bug happened — a client guard of `min(7)` against a
    // server schema of `min(1)` — so the property is pinned rather than
    // assumed: whatever one side accepts, so does the other.
    expect(isValidPhoneNumber(value)).toBe(PhoneNumber.safeParse(value).success);
  });
});

describe("phoneDigits", () => {
  it("counts only digits, so formatting can't change the verdict", () => {
    expect(phoneDigits("+38 (050) 123-45-67")).toBe("380501234567");
    expect(phoneDigits("+380501234567")).toBe("380501234567");
  });
});
