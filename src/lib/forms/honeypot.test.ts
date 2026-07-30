import { describe, expect, it } from "vitest";
import { HONEYPOT_FIELD, isHoneypotTripped } from "./honeypot";

describe("isHoneypotTripped", () => {
  it("is false when the honeypot field is absent", () => {
    expect(isHoneypotTripped({ name: "Марко" })).toBe(false);
  });

  it("is false when the honeypot field is present but empty", () => {
    expect(isHoneypotTripped({ [HONEYPOT_FIELD]: "" })).toBe(false);
    expect(isHoneypotTripped({ [HONEYPOT_FIELD]: "   " })).toBe(false);
  });

  it("is true when a bot filled the honeypot field", () => {
    expect(
      isHoneypotTripped({ [HONEYPOT_FIELD]: "https://spam.example" }),
    ).toBe(true);
  });
});
