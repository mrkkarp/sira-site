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
        <h3 className="type-technical-label text-background/60">
          {dictionary.customerCare.paymentHeading}
        </h3>
        <ul className="type-body-sm text-background/85 mt-(--space-2xs) flex flex-col gap-(--space-3xs)">
          {paymentItemKeys.map((key) => (
            <li key={key}>{dictionary.customerCare[key]}</li>
          ))}
        </ul>
      </div>

      <div>
        <h3 className="type-technical-label text-background/60">
          {dictionary.customerCare.deliveryHeading}
        </h3>
        <ul className="type-body-sm text-background/85 mt-(--space-2xs) flex flex-col gap-(--space-3xs)">
          {deliveryItemKeys.map((key) => (
            <li key={key}>{dictionary.customerCare[key]}</li>
          ))}
        </ul>
      </div>

      <div>
        <h3 className="type-technical-label text-background/60">
          {dictionary.customerCare.warrantyHeading}
        </h3>
        <p className="type-body-sm text-background/85 mt-(--space-2xs)">
          {dictionary.customerCare.warrantyBody}
        </p>

        <h3 className="type-technical-label text-background/60 mt-(--space-sm)">
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
