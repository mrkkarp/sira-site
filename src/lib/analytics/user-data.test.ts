import { describe, expect, it } from "vitest";
import { hashUserData, normalizeEmail, normalizePhone } from "./user-data";

/**
 * These expectations are independent SHA-256 vectors, produced by Node's
 * `crypto` rather than by the module under test. That distinction is the point:
 * a test that hashes with the same code it is testing proves only that the
 * function is deterministic, which is not the property that matters. What
 * matters is that the digest equals the one Google will compute on its side
 * from the same customer's details — so the expected value has to come from
 * somewhere else.
 *
 * The failure this guards against is silent by construction. A wrong
 * normalisation still produces a valid-looking 64-character hex string, the
 * conversion is still counted, and the only symptom is a match rate nobody is
 * watching.
 */
const EMAIL_HASH =
  "75dbddfe4742c92eecdd3b57ccd8e8bf9cebf516619153c52da0eb2a2d1cd884"; // sha256("olena@studio.example")
const PHONE_HASH =
  "6a115656b1d0ab9d381d2cfd9405bfc084fabebfc5ffb50a0e3f9435b9c913a6"; // sha256("+380671112233")

describe("normalizeEmail", () => {
  it("lowercases and trims, the way Google specifies", () => {
    expect(normalizeEmail("  Olena@Studio.Example  ")).toBe(
      "olena@studio.example",
    );
  });

  it("refuses anything that is not an address", () => {
    // Not validation — the form and the API already did that. This is about
    // never producing a hash that is guaranteed to match nothing.
    for (const value of ["", "   ", "olena", "olena@", "@studio.example"]) {
      expect(normalizeEmail(value)).toBeUndefined();
    }
  });
});

describe("normalizePhone", () => {
  it("reads every way a Ukrainian customer writes the same number", () => {
    // The whole job of normalisation, in one assertion: these are one person
    // with one phone, and they must not become five different hashes.
    for (const written of [
      "+380671112233",
      "+38 (067) 111-22-33",
      "00380671112233",
      "380671112233",
      "0671112233",
      "067 111 22 33",
      "671112233",
    ]) {
      expect(normalizePhone(written), written).toBe("+380671112233");
    }
  });

  it("keeps a foreign number's own country code", () => {
    // A Polish designer's number must not be rewritten as Ukrainian.
    expect(normalizePhone("+48 123 456 789")).toBe("+48123456789");
    expect(normalizePhone("0048123456789")).toBe("+48123456789");
  });

  it("returns nothing rather than guessing a country code", () => {
    // Ten digits starting with neither 0 nor 380 could belong to any of a
    // dozen numbering plans. A hash of the wrong guess matches nobody and
    // quietly drags the match rate down; silence is the honest answer.
    expect(normalizePhone("5551234567")).toBeUndefined();
  });

  it("rejects lengths that are not phone numbers at all", () => {
    for (const value of ["", "   ", "12", "+1234567890123456789"]) {
      expect(normalizePhone(value)).toBeUndefined();
    }
  });
});

describe("hashUserData", () => {
  it("produces the same digest Google will compute", async () => {
    expect(
      await hashUserData({
        email: "  Olena@Studio.Example ",
        phone: "067 111 22 33",
      }),
    ).toEqual({
      sha256_email_address: EMAIL_HASH,
      sha256_phone_number: PHONE_HASH,
    });
  });

  it("never lets the plaintext through", async () => {
    // The one mistake in this module that cannot be undone: once a raw address
    // reaches the dataLayer, every tag in the container — including ones added
    // later in the GTM UI without a deploy — can read it.
    const email = "olena@studio.example";
    const phone = "+380671112233";
    const serialised = JSON.stringify(await hashUserData({ email, phone }));

    expect(serialised).not.toContain(email);
    expect(serialised).not.toContain(phone);
    expect(serialised).not.toContain("olena");
    expect(serialised).not.toContain("0671112233");
  });

  it("keeps the field the visitor did fill in", async () => {
    // The quote form asks for a phone and no email; on the contact form email
    // is optional. One match key is worth strictly more than none.
    expect(await hashUserData({ phone: "+380671112233" })).toEqual({
      sha256_phone_number: PHONE_HASH,
    });
    expect(await hashUserData({ email: "olena@studio.example" })).toEqual({
      sha256_email_address: EMAIL_HASH,
    });
  });

  it("omits a key it could not normalise rather than hashing rubbish", async () => {
    expect(
      await hashUserData({ email: "not an address", phone: "5551234567" }),
    ).toEqual({});
  });

  it("returns nothing at all when there is nothing to hash", async () => {
    expect(await hashUserData({})).toEqual({});
    expect(await hashUserData({ email: "", phone: "" })).toEqual({});
  });
});
