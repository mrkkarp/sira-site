import "server-only";
import { normalizeEmail, normalizePhone } from "@/lib/analytics/user-data";

/**
 * The `user_data` block of a Conversions API event: the customer's own contact
 * details, hashed, so Meta can match the lead to the ad that produced it.
 *
 * ## Why this is not `analytics/user-data.ts`
 *
 * That module is Google's. Its key names (`sha256_email_address`,
 * `sha256_phone_number`) are the contract with the Google Ads conversion tag,
 * and its E.164 output carries a leading `+`. Meta wants different key names
 * (`em`, `ph`, `fn`, `country`) and E.164 *without* the plus. Neither format is
 * negotiable and neither vendor tells you when you get it wrong — a mismatched
 * hash is accepted, stored and simply never matches anyone.
 *
 * So this is an adapter, not an edit. `normalizeEmail` and `normalizePhone` are
 * imported and used unchanged: the hard part of hashing is agreeing on what
 * gets hashed, that agreement is already written and tested once, and forking
 * it so Meta could have its own slightly different lowercase-and-trim is how
 * the two quietly drift apart. Only the last two steps — Meta's key names, and
 * dropping the `+` — differ, and they happen here.
 *
 * ## What is deliberately absent
 *
 * - **`ct` (city).** No lead form on this site asks for one. Meta's docs list
 *   it as a strong match key and it is tempting to derive one from the phone
 *   prefix or the IP, but a Ukrainian mobile number carries no city and an IP
 *   geolocation would be a guess. A wrong hash is worse than a missing one: it
 *   can never match, and it drags down the Event Match Quality score that is
 *   the only diagnostic saying anything is wrong.
 * - **`ln` (last name).** See `metaName` below — splitting a name field into
 *   two is a guess about a stranger's culture, not a normalisation.
 * - **`external_id`.** It only helps if the *browser* sends the same value, and
 *   nothing in this codebase gives a visitor a stable ID. Sending one only
 *   server-side adds a key Meta has nothing to match against.
 *
 * The non-hashed keys — `client_ip_address`, `client_user_agent`, `fbp`, `fbc`
 * — are added by the caller from the incoming request; see `lead-event.ts`.
 * Meta requires those to be sent in the clear and rejects hashed values for
 * them.
 */

/**
 * Meta's payload shape. Short snake-case keys because they are the API
 * contract, not a local style choice, and arrays because that is what the
 * Conversions API accepts for the hashed fields.
 */
export type MetaUserData = {
  /** SHA-256 of the normalised email address. */
  em?: string[];
  /** SHA-256 of E.164 digits with no leading `+`. */
  ph?: string[];
  /** SHA-256 of the lowercased first name. */
  fn?: string[];
  /** SHA-256 of the lowercase two-letter ISO country code. */
  country?: string[];
  /** Sent in the clear — Meta rejects these hashed. */
  client_ip_address?: string;
  client_user_agent?: string;
  fbp?: string;
  fbc?: string;
};

/** The plaintext a lead form can actually give us. */
export type MetaUserDataInput = {
  email?: string;
  phone?: string;
  name?: string;
};

/**
 * The one country this site's forms serve, mirroring `DEFAULT_COUNTRY_CODE` in
 * `analytics/user-data.ts`.
 *
 * Only ever derived from a phone number that normalised to `+380…` — i.e. from
 * something the customer typed, not from the locale they are reading in and not
 * from an IP lookup. A visitor reading the English pages from Kyiv is the
 * normal case here, and a `country` hash of the wrong country matches nobody.
 */
const UA_DIALLING_CODE = "+380";
const UA_ISO_CODE = "ua";

/**
 * SHA-256, lowercase hex — the encoding Meta specifies, same as Google's.
 *
 * `globalThis.crypto.subtle` rather than `node:crypto` so this keeps working if
 * a route ever moves to the Edge runtime. Returns `undefined` rather than
 * throwing if Web Crypto is unavailable: a lead that was saved must not fail
 * because measurement could not hash a name.
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
 * Meta's phone normalisation: E.164 digits, no `+`, no separators.
 *
 * Reuses Google's normaliser — which handles `067…`, `0671112233`, `+380…`,
 * `00380…` and the bare nine digits, and returns nothing for a number whose
 * country genuinely cannot be inferred — and then removes the one character the
 * two vendors disagree about.
 */
export function metaPhone(value: string): string | undefined {
  return normalizePhone(value)?.slice(1);
}

/**
 * The first name, lowercased, letters only.
 *
 * The forms here have a single "Ім'я" field, and what people type in it ranges
 * from `Олена` to `Олена Коваль` to `ТОВ "Ремпроект"`. Taking the first
 * whitespace-separated token is the only reading that is right for the common
 * cases and merely useless — rather than wrong — for the rest.
 *
 * Deliberately *not* also emitting `ln` from the second token. Name order is
 * not universal, plenty of Ukrainian forms get a patronymic in that slot, and a
 * surname hash that is actually a patronymic is a hash that matches nobody
 * while still counting against Event Match Quality. `fn` alone is the honest
 * subset.
 *
 * Punctuation and digits are stripped because Meta specifies letters only;
 * anything left empty (a company name in Latin quotes, a phone number typed
 * into the wrong box) returns `undefined` rather than a hash of `""`, which
 * would otherwise be a perfectly valid-looking digest shared by every such
 * lead.
 */
export function metaName(value: string): string | undefined {
  const first = value.trim().split(/\s+/)[0];
  if (!first) return undefined;
  // Unicode letters and apostrophes only — `Ім'я`, `Д'Артаньян`. `\p{L}`
  // rather than `a-z` because the overwhelming majority of these are Cyrillic.
  const letters = first.toLowerCase().replace(/[^\p{L}]/gu, "");
  return letters || undefined;
}

/**
 * Normalise, then hash, whatever the visitor actually typed.
 *
 * Every key is independently optional and absent keys are omitted rather than
 * set to `undefined`: the quote form has no email field, the contact form makes
 * email optional, and a blank field must not cost us the fields that were
 * filled in.
 *
 * Never throws, for the same reason `hashUserData` never does — by the time
 * this runs the lead is already saved, and the correct behaviour on any failure
 * is an unmatched conversion, not a lost one.
 */
export async function buildMetaUserData(
  input: MetaUserDataInput,
): Promise<MetaUserData> {
  try {
    const email = input.email ? normalizeEmail(input.email) : undefined;
    const phone = input.phone ? metaPhone(input.phone) : undefined;
    const name = input.name ? metaName(input.name) : undefined;
    // Only from a number that resolved to the Ukrainian dialling code. An
    // unrecognised or foreign number leaves this out entirely.
    const country =
      input.phone && normalizePhone(input.phone)?.startsWith(UA_DIALLING_CODE)
        ? UA_ISO_CODE
        : undefined;

    const [hashedEmail, hashedPhone, hashedName, hashedCountry] =
      await Promise.all([
        email ? sha256Hex(email) : undefined,
        phone ? sha256Hex(phone) : undefined,
        name ? sha256Hex(name) : undefined,
        country ? sha256Hex(country) : undefined,
      ]);

    return {
      ...(hashedEmail ? { em: [hashedEmail] } : {}),
      ...(hashedPhone ? { ph: [hashedPhone] } : {}),
      ...(hashedName ? { fn: [hashedName] } : {}),
      ...(hashedCountry ? { country: [hashedCountry] } : {}),
    };
  } catch {
    return {};
  }
}
