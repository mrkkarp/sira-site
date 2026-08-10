import { describe, expect, it } from "vitest";
import {
  buildMetaUserData,
  metaName,
  metaPhone,
} from "@/lib/analytics/meta/user-data";

/**
 * Meta's normalisation, checked against digests computed independently
 * (`node -e 'crypto.createHash("sha256")…'`) rather than against this module's
 * own output. Asserting that a hash equals what the code produced would pass
 * for any normalisation at all, correct or not — and the failure this file
 * exists to catch is silent: a hash Meta accepts, stores, and matches to
 * nobody.
 */
const SHA256 = {
  "olena@studio.example":
    "75dbddfe4742c92eecdd3b57ccd8e8bf9cebf516619153c52da0eb2a2d1cd884",
  "380671112233":
    "48ff687850a5d70e0d41f26b4e655378ded787325bc4bd4f042027421beb905f",
  олена: "f51f4c5a6dbe8d89d096ef9c348f716ec27be881a10bb9ba5cbb8cf84f1740a8",
  ua: "844bc172f032bdd2d0baae3536c1d66c2dcba8481b1b6d8fc11fa3c5de29c6cb",
} as const;

describe("meta/user-data", () => {
  describe("metaPhone", () => {
    it("drops the plus Google's E.164 keeps", () => {
      // The one difference between the two vendors' phone format, and the
      // entire reason this adapter exists. `+380671112233` and `380671112233`
      // hash to completely unrelated digests.
      expect(metaPhone("+380 67 111 22 33")).toBe("380671112233");
    });

    it("accepts the three ways Ukrainians actually write a number", () => {
      for (const written of ["067 111 22 33", "0671112233", "00380671112233"]) {
        expect(metaPhone(written)).toBe("380671112233");
      }
    });

    it("returns nothing for a number whose country cannot be inferred", () => {
      // A hash of a guessed country code matches nobody and still counts
      // against Event Match Quality. Silence is the honest answer.
      expect(metaPhone("5551234567")).toBeUndefined();
      expect(metaPhone("не телефон")).toBeUndefined();
    });
  });

  describe("metaName", () => {
    it("takes the first token, lowercased", () => {
      expect(metaName("Олена Коваль")).toBe("олена");
      expect(metaName("  ОЛЕНА  ")).toBe("олена");
    });

    it("strips everything that is not a letter", () => {
      expect(metaName("Д'Артаньян")).toBe("дартаньян");
    });

    it("returns nothing rather than a hash of the empty string", () => {
      // A company typed into the name box, or a phone number in the wrong
      // field. Hashing "" would produce a valid-looking digest shared by every
      // such lead — worse than no key at all.
      expect(metaName('"""')).toBeUndefined();
      expect(metaName("   ")).toBeUndefined();
    });
  });

  describe("buildMetaUserData", () => {
    it("emits Meta's key names, not Google's", () => {
      // `sha256_email_address` here would be silently ignored by the
      // Conversions API — accepted, and matched against nothing.
      return expect(
        buildMetaUserData({
          email: "Olena@Studio.example",
          phone: "+380671112233",
          name: "Олена Коваль",
        }),
      ).resolves.toEqual({
        em: [SHA256["olena@studio.example"]],
        ph: [SHA256["380671112233"]],
        fn: [SHA256["олена"]],
        country: [SHA256.ua],
      });
    });

    it("keeps the keys it has when the others are blank", async () => {
      // The quote form asks for a phone and no email; the contact form makes
      // email optional. A missing field must not cost us the ones that were
      // filled in.
      await expect(
        buildMetaUserData({ phone: "0671112233" }),
      ).resolves.toEqual({
        ph: [SHA256["380671112233"]],
        country: [SHA256.ua],
      });
    });

    it("derives country only from a Ukrainian number, never from nothing", async () => {
      // No form here collects a country, and the locale is the language someone
      // reads in, not where they are phoning from. The only honest source is a
      // number that actually resolved to +380.
      await expect(
        buildMetaUserData({ email: "olena@studio.example" }),
      ).resolves.toEqual({ em: [SHA256["olena@studio.example"]] });

      const foreign = await buildMetaUserData({ phone: "+48123456789" });
      expect(foreign.country).toBeUndefined();
      expect(foreign.ph).toBeDefined();
    });

    it("never emits ct, and never a plaintext value", async () => {
      const built = await buildMetaUserData({
        email: "olena@studio.example",
        phone: "+380671112233",
        name: "Олена Коваль",
      });
      // No lead form on this site asks for a city, and neither a phone prefix
      // nor an IP lookup can supply one. See the module note.
      expect(built).not.toHaveProperty("ct");
      const serialised = JSON.stringify(built);
      expect(serialised).not.toContain("olena@studio.example");
      expect(serialised).not.toContain("380671112233");
      expect(serialised).not.toContain("Олена");
    });

    it("returns an empty object rather than throwing on nonsense", async () => {
      // By the time this runs the lead is saved. Nothing here may turn a saved
      // lead into an error.
      await expect(buildMetaUserData({})).resolves.toEqual({});
      await expect(
        buildMetaUserData({ email: "not an email", phone: "..." }),
      ).resolves.toEqual({});
    });
  });
});
