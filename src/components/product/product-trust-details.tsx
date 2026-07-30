import type { Dictionary } from "@/i18n/get-dictionary";

/**
 * Trust-detail bullets shown under the add-to-cart/quote CTA — Prompt 6 §7.
 * Every line here is a real, confirmed company-wide fact (reusing the same
 * copy already established for the footer/customer-care pages), not a
 * per-product invention: consultation channels, "made in Kyiv", and the
 * RAL/NCS colour-matching offer. `hasColourMatching` is passed in by the
 * caller rather than assumed, since RAL/NCS custom colour only genuinely
 * applies to products that actually have a custom-colour variant in the
 * source data.
 */
export function ProductTrustDetails({
  hasColourMatching,
  dictionary,
}: {
  hasColourMatching: boolean;
  dictionary: Dictionary;
}) {
  const copy = dictionary.product;
  return (
    <ul className="type-body-sm text-text-muted flex flex-col gap-(--space-3xs)">
      <li>{copy.trustMadeInKyiv}</li>
      <li>{copy.trustConsultation}</li>
      {hasColourMatching ? <li>{copy.trustColourMatching}</li> : null}
    </ul>
  );
}
