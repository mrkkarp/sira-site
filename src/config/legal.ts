/**
 * The seller's registration identity, for the public offer.
 *
 * SEPARATE FROM `src/config/contact.ts` on purpose. That file holds the
 * channels a customer uses to reach ODUDLAB — address, phone, email, Instagram
 * — all owner-confirmed. This file holds the things a CONTRACT needs and a
 * contact card does not: the legal form, the registered name, the state
 * registry number.
 *
 * `legalEntity` is `null` because none of it exists anywhere in this codebase or
 * in either content archive, and it is not the kind of fact that can be
 * inferred.
 * `/payment-delivery` says invoices come "від ФОП (або ТОВ)" — which is
 * ambiguous between the two forms and names neither.
 *
 * WHAT `null` DOES: `/public-offer` renders the `PlaceholderPage` while this is
 * `null`, exactly as `en`/`pl` do on the other info pages. The full offer text
 * is already written and sitting in `src/content/legal-pages.ts`; it is gated
 * rather than published because ст. 7 ЗУ «Про електронну комерцію» requires a
 * seller to identify itself, and an offer that takes real money through LiqPay
 * while naming no legal person is worse than no offer page at all.
 *
 * TO PUBLISH IT: replace `null` with the real values below. Nothing else needs
 * to change — the page, the metadata, the sitemap entry and the footer link all
 * follow automatically. Do not fill this in from guesswork; an invented ЄДРПОУ
 * is a false statement in a contract.
 *
 * The three other legal pages (`/privacy-policy`, `/cookies-policy`,
 * `/terms-of-use`) do NOT depend on this and are live already: they identify
 * the operator by trading name and contact details, which is sufficient for
 * them and fully confirmed.
 */
export type LegalEntity = {
  /** Full registered name, e.g. `ФОП Прізвище Ім'я По батькові` or `ТОВ «…»`. */
  registeredName: string;
  /** `ЄДРПОУ` for a legal person, `ІПН`/`РНОКПП` for a ФОП. */
  registryLabel: "ЄДРПОУ" | "ІПН";
  registryNumber: string;
  /**
   * Registered (legal) address. May differ from the showroom in
   * `contact.address.line` — if it is the same, repeat it here rather than
   * importing, so that changing one never silently changes the other.
   */
  registeredAddress: string;
  /** VAT registration, if any. `null` = not a VAT payer / not confirmed. */
  vatNumber: string | null;
};

export const legalEntity: LegalEntity | null = null;
