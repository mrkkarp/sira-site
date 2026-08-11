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
 * - `sku`: the real per-variant SKU (distinct for base vs custom colour), but
 *   omitted entirely when it is just the product name again — see the note at
 *   the assignment.
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
}: {
  product: Product;
  variant: ProductVariant;
  siteUrl: string;
  path: string;
  brandName: string;
  categoryName?: string;
}): Record<string, unknown> {
  const canonicalUrl = `${siteUrl.replace(/\/$/, "")}${path}`;

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
   * A SKU that merely repeats the product name is not an identifier, and
   * Google rejects it outright — «Недійсне значення в полі "sku"». Roughly
   * half the catalogue is in that state, because the Horoshop export used the
   * name as the article code for every single-variant product ("Volcano",
   * "TOWER", "Monro"). The honest answer is to say nothing rather than to
   * repeat the name in an identifier field, so the property is dropped when it
   * carries no information the `name` has not already given. Comparison is
   * case- and whitespace-insensitive because the export capitalises the two
   * inconsistently ("Circle" vs "CIRCLE").
   *
   * Invent nothing here: if the workshop has real article codes, they belong
   * in the source data (and then in `mpn` as well), not in this function.
   */
  const normalise = (value: string) => value.trim().toLowerCase();
  const sku =
    variant.sku && normalise(variant.sku) !== normalise(product.name)
      ? variant.sku
      : undefined;

  const json: Record<string, unknown> = {
    "@context": "https://schema.org",
    "@type": "Product",
    name: product.name,
    description,
    image: images,
    sku,
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
