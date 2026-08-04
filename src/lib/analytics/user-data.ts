import { phoneDigits } from "@/domain/shared/phone-rule";

/**
 * Enhanced Conversions: the customer's own contact details, hashed, so Google
 * can match a conversion to the ad click that caused it.
 *
 * ## Why this exists at all
 *
 * A conversion is only attributable if Google can join it to a click. Cookies
 * used to do that; between ITP, ad blockers and consent refusals they now miss
 * a large and *unevenly distributed* share of conversions — and uneven is the
 * problem. Under-reporting is not a flat discount applied to every campaign; it
 * lands hardest on exactly the traffic that refuses cookies, so the bidding
 * learns from a biased sample. Enhanced Conversions closes part of that gap by
 * matching on a hash of something the customer typed anyway.
 *
 * For this business the argument is stronger than usual. Volume here is a few
 * enquiries, not thousands, and a handful of unattributed conversions is a
 * large fraction of the signal a Smart Bidding strategy has to learn from.
 *
 * ## What leaves the browser
 *
 * Only SHA-256 hashes, and only into `window.dataLayer`. The plaintext address
 * and phone number are already going to our own `/api/*` route because that is
 * how the enquiry reaches the workshop; what must never happen is the raw value
 * being pushed to the dataLayer, where every tag in the container — including
 * third-party ones the owner may add later in the GTM UI without a deploy —
 * could read it. `analytics/user-data.test.ts` asserts the plaintext is absent
 * from the payload, because this is a mistake that cannot be taken back once a
 * tag has exfiltrated it.
 *
 * ## Why normalisation is the whole job
 *
 * SHA-256 is one line. Everything hard here is agreeing with Google on what
 * gets hashed. `Olena@Studio.example ` and `olena@studio.example` produce two
 * completely unrelated digests, and a hash that matches nothing fails
 * *silently* — the conversion is still counted, the match rate is just quietly
 * lower, and there is nothing in the Ads UI that says "your normalisation is
 * wrong". So the rules below follow Google's published spec exactly, and where
 * the correct answer is genuinely unknown this module returns nothing rather
 * than guessing. A wrong hash is strictly worse than an absent one: it can
 * never match, and it inflates the denominator of the match-rate diagnostic
 * that would otherwise reveal the problem.
 */

/**
 * The payload shape Google expects. Snake-case because these key names are the
 * contract with the tag, not a local style choice — the Google Ads conversion
 * tag reads exactly these.
 */
export type HashedUserData = {
  sha256_email_address?: string;
  sha256_phone_number?: string;
};

/**
 * Google's email normalisation: strip surrounding whitespace, lowercase.
 *
 * Deliberately *not* doing the Gmail trick of stripping dots from the local
 * part. That rule appears in the Customer Match documentation, and Google
 * applies its own canonicalisation to Gmail addresses on receipt; doing it here
 * as well would mean two normalisations that can drift apart, and the failure
 * would be invisible. Matching the published Enhanced Conversions spec — and
 * only that — is what keeps this verifiable.
 *
 * Returns `undefined` for anything that is not recognisably an address. The
 * check is deliberately shallow: `local@domain.tld` with no spaces. This is not
 * validating the customer's input — the form and the API already did that — it
 * is refusing to hash a value that clearly is not an email, because such a hash
 * is guaranteed never to match and would only pollute the match rate.
 */
export function normalizeEmail(value: string): string | undefined {
  const normalized = value.trim().toLowerCase();
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(normalized)) return undefined;
  return normalized;
}

/**
 * The country the site's forms serve today.
 *
 * Ukrainian customers routinely type `067 111 22 33` or `0671112233` — a
 * national number with no country code — and Google requires E.164. Prepending
 * +380 to those is not a guess: the storefront sells in UAH, delivers within
 * Ukraine, and this is the numbering plan those two shapes belong to.
 *
 * When the Polish branch launches this stops being safe to assume, and the
 * assumption is isolated here for that reason. Note that locale is *not* the
 * answer: `uk`/`en`/`pl` is the language a visitor reads in, not the country
 * they are phoning from, and an English-reading customer in Kyiv is the normal
 * case rather than the edge one.
 */
const DEFAULT_COUNTRY_CODE = "380";
const UA_NATIONAL_DIGITS = 9;

/**
 * Google's phone normalisation: E.164 — a leading `+`, country code, digits,
 * nothing else.
 *
 * The cases, in order of how confident we can be:
 *
 *   - Already international (`+…`, or `00…` as dialled from a landline) — take
 *     the digits as given. The customer told us the country code.
 *   - `380…` at full length, or a national `0…`, or the bare nine digits — a
 *     Ukrainian number in one of the three ways people actually write them.
 *   - Anything else — `undefined`. A ten-digit number that starts with neither
 *     0 nor 380 could be from any of a dozen countries, and a hash of the wrong
 *     one matches nobody. Silence is the honest answer.
 */
export function normalizePhone(value: string): string | undefined {
  const trimmed = value.trim();
  if (!trimmed) return undefined;

  const digits = phoneDigits(trimmed);
  if (!digits) return undefined;

  // The customer supplied a country code themselves.
  if (trimmed.startsWith("+")) return e164(digits);
  if (digits.startsWith("00")) return e164(digits.slice(2));

  if (digits.startsWith(DEFAULT_COUNTRY_CODE)) return e164(digits);
  // National format: a single leading zero standing in for the country code.
  if (digits.startsWith("0")) {
    return e164(DEFAULT_COUNTRY_CODE + digits.slice(1));
  }
  if (digits.length === UA_NATIONAL_DIGITS) {
    return e164(DEFAULT_COUNTRY_CODE + digits);
  }

  return undefined;
}

/**
 * E.164 caps the whole number at 15 digits and no real one is shorter than 7.
 * Outside that range this is a typo, not a phone number, and hashing it would
 * produce a digest that matches nothing.
 */
function e164(digits: string): string | undefined {
  if (digits.length < 7 || digits.length > 15) return undefined;
  return `+${digits}`;
}

/**
 * SHA-256, lowercase hex — the encoding Google specifies.
 *
 * `crypto.subtle` is only defined in a secure context, so this is `undefined`
 * on a plain-http origin. That is not a failure worth surfacing to anyone: the
 * production site is HTTPS, and the fallback is simply an unenhanced
 * conversion, which is what we had before this module existed.
 */
async function sha256Hex(value: string): Promise<string | undefined> {
  const subtle = globalThis.crypto?.subtle;
  if (!subtle) return undefined;
  const bytes = new TextEncoder().encode(value);
  const digest = await subtle.digest("SHA-256", bytes);
  return Array.from(new Uint8Array(digest))
    .map((byte) => byte.toString(16).padStart(2, "0"))
    .join("");
}

/**
 * Normalise then hash whatever the visitor actually typed.
 *
 * Every key is independently optional: the quote form asks for a phone and no
 * email, the contact form makes email optional, and a customer who leaves a
 * field blank must not cost us the field they did fill in. Absent keys are
 * omitted rather than set to `undefined`, so the object serialises cleanly into
 * the dataLayer.
 *
 * Never throws. Enhanced Conversions is an improvement to attribution, not a
 * step in submitting an enquiry — if hashing fails for any reason the lead has
 * still been saved, and the correct behaviour is to report the conversion
 * without the enhancement rather than to lose it.
 */
export async function hashUserData(input: {
  email?: string;
  phone?: string;
}): Promise<HashedUserData> {
  try {
    const email = input.email ? normalizeEmail(input.email) : undefined;
    const phone = input.phone ? normalizePhone(input.phone) : undefined;

    const [hashedEmail, hashedPhone] = await Promise.all([
      email ? sha256Hex(email) : undefined,
      phone ? sha256Hex(phone) : undefined,
    ]);

    return {
      ...(hashedEmail ? { sha256_email_address: hashedEmail } : {}),
      ...(hashedPhone ? { sha256_phone_number: hashedPhone } : {}),
    };
  } catch {
    return {};
  }
}
