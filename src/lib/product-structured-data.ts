import type { Product, ProductVariant } from "@/lib/schemas/product";
import { buildDescriptionSections } from "@/lib/product-description";

/**
 * Builds the Product JSON-LD object for a product page (Prompt 6 §15).
 * Pure/unit-testable — the caller (a server component) supplies the
 * absolute site URL and canonical path via `getSiteUrl()`/`localeHref()`,
 * and this stays free of any Next.js/runtime dependency.
 *
 * Every field below is either a genuinely real, already-established value
 * or a deliberately conservative, honest default — never fabricated:
 * - `image`: deduped list of the selected variant's photo, the product's
 *   base photo, and the custom-colour photo if it exists — every one of
 *   these is a real asset path, nothing invented.
 * - `description`: the same real "intro" paragraph shown in the structured
 *   description (§8) — reuses `buildDescriptionSections` rather than dumping
 *   the raw `fullDesc` (which also contains the "Характеристики" spec list)
 *   into a search-result snippet; falls back to the raw description for the
 *   rare row where the intro split comes back empty.
 * - `sku`: NOT emitted at all — the catalogue has no article codes, only names
 *   in disguise. See the long note where it used to be assigned.
 * - `category`: the localised shop-category label — the exact same string the
 *   breadcrumb above the page already shows, resolved by the caller through
 *   `shopCategoryLabel`. Not a taxonomy code and not a guess: schema.org lets
 *   `category` be free text, and Google's merchant-listing report was flagging
 *   its absence while the value sat one component away. Passing the localised
 *   label rather than the `shopCategory` slug matters because Google reads the
 *   structured data in the page's own language.
 * - `offers.availability`: every ODUDLAB product is made to order (see the
 *   always-shown "Made to order" badge in `ProductCoreInfo`) — there is no
 *   real "ready to ship" stock signal anywhere in the source data, so
 *   `"https://schema.org/BackOrder"` is the honest schema.org value across
 *   the board. Claiming `"InStock"` would be a fabrication.
 * - `itemCondition`: always `"https://schema.org/NewCondition"` — every
 *   product is newly manufactured concrete, never used/refurbished.
 * - `offers.shippingDetails` / `offers.hasMerchantReturnPolicy`: see the two
 *   long notes at their construction below. Both encode facts the owner stated
 *   directly (2026-08-11); neither is inferred from the old Horoshop copy.
 * - `material`: only included when the product's real `specEntries` has a
 *   "Матеріал" row — never guessed for categories without that field.
 * - `additionalProperty`: only included when the selected variant has a
 *   real `colorLabel` — represents genuine variant data (Prompt 6 §15's
 *   "variant data" requirement), not an invented property.
 * - No `aggregateRating`/`review` — there is no real review data anywhere
 *   in this project, and Prompt 6 explicitly forbids fabricating one.
 */
export function buildProductJsonLd({
  product,
  variant,
  siteUrl,
  path,
  brandName,
  categoryName,
  pickupLabel,
  shippingSettingsPath,
}: {
  product: Product;
  variant: ProductVariant;
  siteUrl: string;
  path: string;
  brandName: string;
  categoryName?: string;
  /**
   * Localised name of the one shipping option that has a knowable price —
   * `customerCare.deliveryPickup` ("Безкоштовний самовивіз" / "Free pickup" /
   * "Bezpłatny odbiór własny"). Passed in rather than hardcoded because /en and
   * /pl render the same generator and Google reads structured data in the
   * page's own language.
   */
  pickupLabel?: string;
  /** Locale-aware path to the full delivery terms, e.g. `/en/payment-delivery`. */
  shippingSettingsPath?: string;
}): Record<string, unknown> {
  const origin = siteUrl.replace(/\/$/, "");
  const canonicalUrl = `${origin}${path}`;

  const images = Array.from(
    new Set(
      [variant.photo, product.base.photo, product.customColour?.photo].filter(
        (photo): photo is string => Boolean(photo),
      ),
    ),
  );

  // Match on the locale-independent `key`, never on `label`: the label is
  // translated per locale ("Матеріал" / "Material" / "Materiał"), so matching
  // it silently dropped `material` from the structured data on /en and /pl.
  // The Ukrainian label is still accepted as a fallback for legacy entries
  // parsed before `key` existed.
  const materialEntry = product.specEntries.find((entry) =>
    entry.key ? entry.key === "material" : entry.label === "Матеріал",
  );
  const [intro] = buildDescriptionSections(variant.description);
  const description = intro?.text || variant.description || undefined;

  /**
   * `sku` is deliberately NOT emitted. Google rejected it — «Недійсне значення
   * в полі "sku"» — and an audit of all 67 rows in the Horoshop export showed
   * it was right: this catalogue contains no article codes at all.
   *
   * Half the rows use the product name verbatim as the code ("Volcano",
   * "TOWER", "Monro"). The other half only look like identifiers and are in
   * fact the name shortened or transliterated — "Odri n" for «ODRI накладна»,
   * "Monro k" for «MONRO з канелюрами», "33" for «Циліндр 33», "pivsfera-50"
   * for «Півсфера 50», "buddha" for «Панно з бетону "BUDDHA"». Google flagged
   * `/products/odri-nakladna` precisely because "Odri n" is a prefix of the
   * transliterated name, so tightening the old name-equality rule would only
   * have moved the boundary, not found a real identifier behind it.
   *
   * Several values are not even that — they are import artefacts: "copy_Semi"
   * on «LITTLE SEMI накладна», "Plink" on a product named «Plyn», and
   * "Skolot basinc" on the product aliased `vira-u-vashomu-kolori`. A field
   * that is redundant on its best rows and wrong on its worst is not an
   * identifier, and saying nothing is the honest answer.
   *
   * Invent nothing here. If the workshop does keep real internal article
   * codes, they belong in the source data — and then here in `sku`, and in
   * `mpn` alongside it, which would also answer Google's separate «Немає
   * глобального ідентифікатора» warning.
   */

  /**
   * Google's merchant-listing report flags every product for a missing
   * `shippingDetails`. The facts below come from the owner directly
   * (2026-08-11), not from the Horoshop copy:
   *
   *   «протягом двох робочих днів після виготовлення, возимо по Україні та у
   *    Європу. самовивіз безкоштовно у робочі дні 10-18» — виготовлення
   *   «зазвичай 2-3 тижні», вартість «самовивіз 0 грн, решта — за тарифами
   *    перевізника».
   *
   * Only ONE option is expressed here, and deliberately so. `shippingRate` is
   * a `MonetaryAmount` — a single number — and the only number that exists is
   * pickup's zero. Нова пошта and кур'єр are «за тарифами перевізника», a
   * figure the workshop does not set and cannot know per product; emitting a
   * guessed value would be a fabrication, and emitting the entry with no
   * `shippingRate` would just trade this warning for another one. Those options
   * are carried in prose on /payment-delivery, which `shippingSettingsLink`
   * points at, exactly as schema.org intends for rates that live off-page.
   *
   * `handlingTime` 14–21 days is the stated 2–3 week build time, in calendar
   * days. `transitTime` is 0 for pickup because there is no carrier leg — that
   * is a fact about pickup, not an estimate. The two-business-day dispatch
   * window applies only to the carrier options, so it is not folded in here.
   *
   * `shippingDestination` is `UA` alone. The owner also ships to Europe, but
   * "Europe" is not a country and `DefinedRegion` wants real ones — listing a
   * made-up set of European countries would be inventing coverage. The page
   * copy says it in words instead.
   */
  const shippingDetails: Record<string, unknown> = {
    "@type": "OfferShippingDetails",
    shippingRate: {
      "@type": "MonetaryAmount",
      value: 0,
      currency: "UAH",
    },
    shippingDestination: {
      "@type": "DefinedRegion",
      addressCountry: "UA",
    },
    deliveryTime: {
      "@type": "ShippingDeliveryTime",
      handlingTime: {
        "@type": "QuantitativeValue",
        minValue: 14,
        maxValue: 21,
        unitCode: "DAY",
      },
      transitTime: {
        "@type": "QuantitativeValue",
        minValue: 0,
        maxValue: 0,
        unitCode: "DAY",
      },
    },
  };
  if (pickupLabel) {
    shippingDetails.shippingLabel = pickupLabel;
  }
  if (shippingSettingsPath) {
    shippingDetails.shippingSettingsLink = `${origin}${shippingSettingsPath}`;
  }

  /**
   * The other half of the merchant-listing warning. Asked whether a customer
   * may return an undamaged product, the owner answered: «немає. бо вироби
   * виготовляються під замовлення» — which is `MerchantReturnNotPermitted`,
   * the schema.org value that needs no `merchantReturnDays` or fee fields
   * precisely because there is no return window to describe.
   *
   * This is not the same as having no recourse, and the distinction matters:
   * transit damage is covered by the carrier's insurance (hence the owner's
   * «оглядайте товар одразу на новій пошті»), and a genuine manufacturing
   * defect is the workshop's own cost («виробник оплачує доставку назад або
   * знищення»). schema.org has no vocabulary for either — `MerchantReturnPolicy`
   * only models voluntary change-of-mind returns — so both live in prose on
   * /returns. Encoding them here as if they were a return window would
   * misstate the policy in the direction of overpromising.
   */
  const hasMerchantReturnPolicy = {
    "@type": "MerchantReturnPolicy",
    applicableCountry: "UA",
    returnPolicyCategory: "https://schema.org/MerchantReturnNotPermitted",
  };

  const json: Record<string, unknown> = {
    "@context": "https://schema.org",
    "@type": "Product",
    name: product.name,
    description,
    image: images,
    brand: {
      "@type": "Brand",
      name: brandName,
    },
    offers: {
      "@type": "Offer",
      url: canonicalUrl,
      priceCurrency: "UAH",
      price: variant.price,
      itemCondition: "https://schema.org/NewCondition",
      availability: "https://schema.org/BackOrder",
      shippingDetails,
      hasMerchantReturnPolicy,
    },
  };

  if (categoryName) {
    json.category = categoryName;
  }

  if (materialEntry) {
    json.material = materialEntry.value;
  }

  if (variant.colorLabel) {
    // schema.org/Product has a first-class `color` property, so the colour no
    // longer needs a custom PropertyValue whose *name* was the hardcoded
    // Ukrainian "Колір" — that name shipped untranslated on /en and /pl, where
    // Google reads the structured data in the page's own language.
    json.color = variant.colorLabel;
  }

  return json;
}
