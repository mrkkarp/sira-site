import Link from "next/link";
import type { Locale } from "@/i18n/config";
import type { Dictionary } from "@/i18n/get-dictionary";
import type { Product } from "@/lib/schemas/product";
import { localeHref } from "@/lib/locale-href";
import { shopCategoryLabel } from "@/lib/shop-category-label";
import { Price } from "@/components/ui/price";
import { Badge } from "@/components/ui/badge";
import { MediaFrame } from "@/components/layout/media-frame";
import { ProductImage } from "@/components/product/product-image";

/**
 * Universal product card — used on the homepage "Популярні вироби" slider
 * and the `/shop` catalog grid.
 *
 * Deliberately does NOT swap to a second "hover photo" — the real product
 * data has exactly one photo per colour variant, so a hover-swap would have
 * to reuse/fake a second image. Hover instead only scales the single real
 * photo (BRAND_VISUAL_GUIDE — no shadow/radius affordances).
 *
 * No "Buy now" button, no wishlist icon (neither is implemented anywhere in
 * this project yet) and no "New"/bestseller badge (no such field exists in
 * the source data) — see Prompt 5's known-limitations note.
 */
export function ProductCard({
  product,
  locale,
  dictionary,
  priority = false,
}: {
  product: Product;
  locale: Locale;
  dictionary: Dictionary;
  priority?: boolean;
}) {
  const typeLabel = shopCategoryLabel(product.shopCategory, dictionary);
  const href = localeHref(locale, `/products/${product.slug}`);
  const hasCustomColour = Boolean(product.customColour);
  const cardCopy = dictionary.shop.productCard;

  return (
    <Link
      href={href}
      className="group block focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-(--color-focus)"
    >
      <MediaFrame ratio="product-card">
        {/* Always the base (hero / Payload `mainImage`) shot. Never the
            custom-colour variant photo: for Horoshop-imported galleries the
            "custom" photo is derived as the trailing gallery image, which is
            frequently a dimension drawing — those must never be a card cover. */}
        <ProductImage
          src={product.base.photo}
          alt={`ODUDLAB ${product.name}, ${typeLabel.toLowerCase()}`}
          sizes="(min-width: 1024px) 25vw, (min-width: 640px) 50vw, 85vw"
          priority={priority}
          className="transition-transform duration-(--duration-normal) ease-(--ease-standard) group-hover:scale-[1.03]"
          brokenLabel={dictionary.shop.states.brokenImageAlt}
        />
        <div className="pointer-events-none absolute top-(--space-2xs) left-(--space-2xs) flex flex-wrap gap-(--space-3xs)">
          <Badge>{cardCopy.madeToOrderBadge}</Badge>
        </div>
      </MediaFrame>
      <div className="mt-(--space-xs) flex flex-col gap-(--space-3xs)">
        <p className="type-caption text-text-muted">{typeLabel}</p>
        <h3 className="type-h4 text-text">{product.name}</h3>
        <div className="flex items-baseline gap-(--space-2xs)">
          {hasCustomColour ? (
            <span className="type-caption text-text-muted">
              {cardCopy.fromPricePrefix}
            </span>
          ) : null}
          <Price amount={product.base.price} locale={locale} />
        </div>
        {hasCustomColour ? (
          <p className="type-caption text-text-muted">
            {cardCopy.customColourAvailable}
          </p>
        ) : null}
      </div>
    </Link>
  );
}
