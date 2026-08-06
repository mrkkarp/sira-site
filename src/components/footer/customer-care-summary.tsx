import Link from "next/link";
import type { Locale } from "@/i18n/config";
import type { Dictionary } from "@/i18n/get-dictionary";
import { localeHref } from "@/lib/locale-href";
import {
  careItemKeys,
  deliveryItemKeys,
  paymentItemKeys,
  warrantyReadMoreHref,
} from "@/config/customer-care";

/**
 * Reusable footer summary of confirmed payment/delivery/warranty/care
 * facts. Intentionally short — full legal/warranty text lives on the
 * dedicated pages; this only links out to them (see
 * `src/config/customer-care.ts` for why).
 *
 * The four headings take `--brand-accent-on-dark` for the same reason
 * `BrandEyebrow` exists: they are labels naming a group, not text anyone reads
 * for content, and every other small uppercase label on the site is now the
 * brand's colour. Leaving these four at `text-background/60` would have been
 * one visual role rendered in two colours, a few hundred pixels below the
 * terracotta column indexes doing exactly the same job.
 *
 * They are deliberately not `BrandEyebrow`: that component is `type-eyebrow`
 * on a `<p>`, and these are `type-technical-label` on an `<h3>` — a real
 * heading in the drawing system's voice, which is the vocabulary the footer
 * uses throughout. Same colour, different vocabulary. Contrast goes up rather
 * than down: 5.75:1 on the band, where the 60%-opacity grey was lower.
 */
export function CustomerCareSummary({
  locale,
  dictionary,
}: {
  locale: Locale;
  dictionary: Dictionary;
}) {
  return (
    <div className="grid grid-cols-1 gap-(--space-md) sm:grid-cols-3">
      <div>
        <h3 className="type-technical-label text-brand-accent-on-dark">
          {dictionary.customerCare.paymentHeading}
        </h3>
        <ul className="type-body-sm text-background/85 mt-(--space-2xs) flex flex-col gap-(--space-3xs)">
          {paymentItemKeys.map((key) => (
            <li key={key}>{dictionary.customerCare[key]}</li>
          ))}
        </ul>
      </div>

      <div>
        <h3 className="type-technical-label text-brand-accent-on-dark">
          {dictionary.customerCare.deliveryHeading}
        </h3>
        <ul className="type-body-sm text-background/85 mt-(--space-2xs) flex flex-col gap-(--space-3xs)">
          {deliveryItemKeys.map((key) => (
            <li key={key}>{dictionary.customerCare[key]}</li>
          ))}
        </ul>
      </div>

      <div>
        <h3 className="type-technical-label text-brand-accent-on-dark">
          {dictionary.customerCare.warrantyHeading}
        </h3>
        <p className="type-body-sm text-background/85 mt-(--space-2xs)">
          {dictionary.customerCare.warrantyBody}
        </p>

        <h3 className="type-technical-label text-brand-accent-on-dark mt-(--space-sm)">
          {dictionary.customerCare.careHeading}
        </h3>
        <ul className="type-body-sm text-background/85 mt-(--space-2xs) flex flex-col gap-(--space-3xs)">
          {careItemKeys.map((key) => (
            <li key={key}>{dictionary.customerCare[key]}</li>
          ))}
        </ul>

        <Link
          href={localeHref(locale, warrantyReadMoreHref)}
          className="type-body-sm text-background decoration-background/40 hover:decoration-background mt-(--space-3xs) inline-block py-(--space-3xs) underline underline-offset-4"
        >
          {dictionary.customerCare.readMore}
        </Link>
      </div>
    </div>
  );
}
