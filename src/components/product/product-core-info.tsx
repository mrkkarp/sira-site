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
 * Also deliberately never claims "У наявності" (in stock) — the only real
 * stock signal in the source data is the negative "may be out of stock"
 * note (`ProductVariant.mayBeOutOfStock`); its absence is not proof of
 * availability (see `parseMayBeOutOfStock`), so an unconditional positive
 * claim would be fabricated. Every ODUDLAB piece is handmade to order, so
 * the "made to order" badge is unconditional (matches `ProductCard`).
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
  /** How to present the resolved variant's price (computed in
   * `ProductExperience` from the real variant/choice data):
   *  - `"fixed"`   — a plain exact price;
   *  - `"from"`    — a "від"/"from" floor (a standard colour is shown but a
   *                  differently-priced or consultation-only custom colour
   *                  exists, so this is the starting price);
   *  - `"surcharge"` — an exact price plus the real per-colour surcharge. */
  priceDisplay: {
    type: "fixed" | "from" | "surcharge";
    amount: number;
    surcharge: number;
  };
  locale: Locale;
  dictionary: Dictionary;
}) {
  const typeLabel = shopCategoryLabel(product.shopCategory, dictionary);
  const cardCopy = dictionary.shop.productCard;

  return (
    <div className="flex flex-col gap-(--space-2xs)">
      <p className="type-caption text-text-muted">{typeLabel}</p>
      <h1 className="type-h2 text-text">{product.name}</h1>

      <div className="flex flex-col gap-(--space-3xs)">
        <div className="flex flex-wrap items-baseline gap-(--space-2xs)">
          {priceDisplay.type === "from" ? (
            <span className="type-caption text-text-muted">
              {cardCopy.fromPricePrefix}
            </span>
          ) : null}
          <Price amount={priceDisplay.amount} locale={locale} />
        </div>
        {priceDisplay.type === "surcharge" ? (
          <span className="type-caption text-text-muted inline-flex items-baseline gap-(--space-3xs)">
            <span aria-hidden="true">+</span>
            <Price amount={priceDisplay.surcharge} locale={locale} />
            <span>{dictionary.product.colourSurchargeSuffix}</span>
          </span>
        ) : null}
      </div>

      <div className="flex flex-wrap gap-(--space-3xs)">
        <Badge>{cardCopy.madeToOrderBadge}</Badge>
        {variant.mayBeOutOfStock ? (
          <Badge tone="error">{dictionary.product.mayBeOutOfStock}</Badge>
        ) : null}
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
