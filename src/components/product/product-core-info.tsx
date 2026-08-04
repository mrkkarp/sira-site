import type { Locale } from "@/i18n/config";
import type { Dictionary } from "@/i18n/get-dictionary";
import type { Product, ProductVariant } from "@/lib/schemas/product";
import { formatTemplate } from "@/lib/format-template";
import { shopCategoryLabel } from "@/lib/shop-category-label";
import { Price } from "@/components/ui/price";
import { Badge } from "@/components/ui/badge";

/**
 * Product page core info block — Prompt 6 §3.
 *
 * Deliberately does NOT render a strikethrough "old price" (`compareAtAmount`)
 * anywhere: the source export has exactly one `price` per colour row, never
 * an original-vs-discounted pair, so there is no genuine discount to show.
 *
 * No stock claim is made in either direction. "У наявності" was never shown,
 * because the source data has no positive stock signal to base it on. The
 * negative one — "можлива тимчасова відсутність на складі", parsed out of
 * nine products' Horoshop descriptions by `parseMayBeOutOfStock` — is no
 * longer shown either, on the owner's instruction. It never belonged beside
 * the price of a made-to-order piece: every ODUDLAB item is cast after the
 * order is placed, so "may be out of stock" answers a question ("is one
 * sitting on a shelf?") that does not apply, and answers it with a doubt.
 * The lead time below says the useful version of the same fact.
 *
 * The flag itself is untouched in the data — `stockNote` still reaches the
 * Payload admin, so the workshop keeps the note it wrote; it just stops being
 * a red badge on the shopfront.
 *
 * Every ODUDLAB piece is handmade to order, so the "made to order" badge is
 * unconditional (matches `ProductCard`).
 */
export function ProductCoreInfo({
  product,
  variant,
  priceDisplay,
  locale,
  dictionary,
}: {
  product: Product;
  variant: ProductVariant;
  /** How to present the resolved variant's full price (computed in
   * `ProductExperience`): `"from"` shows a "від"/"from" floor (a standard
   * colour is displayed while a custom colour also exists), `"fixed"` shows
   * the plain price of the selected colour. Always the real variant price —
   * never a surcharge breakdown. */
  priceDisplay: { type: "fixed" | "from"; amount: number };
  locale: Locale;
  dictionary: Dictionary;
}) {
  const typeLabel = shopCategoryLabel(product.shopCategory, dictionary);
  const cardCopy = dictionary.shop.productCard;

  return (
    <div className="flex flex-col gap-(--space-2xs)">
      <p className="type-caption text-text-muted">{typeLabel}</p>
      <h1 className="type-h2 text-text">{product.name}</h1>

      <div className="flex flex-wrap items-baseline gap-(--space-2xs)">
        {priceDisplay.type === "from" ? (
          <span className="type-caption text-text-muted">
            {cardCopy.fromPricePrefix}
          </span>
        ) : null}
        <Price amount={priceDisplay.amount} locale={locale} />
      </div>

      <div className="flex flex-wrap gap-(--space-3xs)">
        <Badge>{cardCopy.madeToOrderBadge}</Badge>
      </div>

      <dl className="type-body-sm text-text-muted flex flex-col gap-(--space-3xs)">
        <div className="flex gap-(--space-2xs)">
          <dt>{dictionary.product.skuLabel}</dt>
          <dd>{variant.sku}</dd>
        </div>
        {variant.colorLabel ? (
          <div className="flex gap-(--space-2xs)">
            <dt>{dictionary.product.colourLabel}</dt>
            <dd>{variant.colorLabel}</dd>
          </div>
        ) : null}
        {variant.leadTimeWeeks ? (
          <div>
            <dd>
              {formatTemplate(dictionary.product.leadTimeTemplate, {
                weeks: variant.leadTimeWeeks,
              })}
            </dd>
          </div>
        ) : null}
      </dl>
    </div>
  );
}
