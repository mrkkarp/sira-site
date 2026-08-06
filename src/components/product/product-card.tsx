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
import { CoordinateLabel, drawingIndex } from "@/components/technical-drawing";
import { BrandAccentLine } from "@/components/brand";

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
 *
 * ## The drawing layer, kept to a minimum
 *
 * A card is a photograph first, so this gets the smallest dose in the system:
 * one hairline under the frame, the category and the product's real SKU set
 * as marginal annotation on a single line, and a position number that appears
 * over the frame on hover. No dimensions, no specification rows — those are
 * the product page's job, and a grid of twenty cards each carrying a spec
 * table is exactly the "CAD decorations" failure the brief rules out.
 */
export function ProductCard({
  product,
  locale,
  dictionary,
  priority = false,
  index,
}: {
  product: Product;
  locale: Locale;
  dictionary: Dictionary;
  priority?: boolean;
  /** Position of this card in the view that renders it. Drives the number
   *  revealed on hover; omit it and no number is drawn. */
  index?: number;
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
        {/* "На замовлення" in the brand tone. This is the one mark on a
            catalogue card that is visible without hovering, and it is the right
            one to colour: it sits in the corner rather than over the object,
            and what it says — every piece is cast to order — is the claim the
            brand is actually making. */}
        <div className="pointer-events-none absolute top-(--space-2xs) left-(--space-2xs) flex flex-wrap gap-(--space-3xs)">
          <Badge tone="accent">{cardCopy.madeToOrderBadge}</Badge>
        </div>
        {index === undefined ? null : (
          // Opaque plate, not translucent: catalogue photos run from luminance
          // 96 to 245, and a translucent one drops this 11px numeral to 3.8:1
          // over the darkest of them.
          <span className="bg-background pointer-events-none absolute top-(--space-2xs) right-(--space-2xs) translate-y-1 px-(--space-3xs) opacity-0 transition-[opacity,translate] duration-(--duration-normal) ease-(--ease-nav) group-hover:translate-y-0 group-hover:opacity-100 group-focus-visible:translate-y-0 group-focus-visible:opacity-100">
            <CoordinateLabel>{drawingIndex(index + 1)}</CoordinateLabel>
          </span>
        )}
      </MediaFrame>
      <div className="mt-(--space-2xs) flex flex-col gap-(--space-3xs)">
        {/* The card's one brand beat, and it is the rule that was already
            here — not a new mark. At rest this is the same construction
            hairline it has always been, so a grid of twenty cards is exactly
            as quiet as before; the terracotta only draws itself across the
            card the cursor is actually on. That is the whole reason the accent
            lives on hover rather than at rest: a catalogue page is twenty
            photographs competing for attention, and twenty coloured rules
            would compete with all of them at once. */}
        <BrandAccentLine onHover />
        <div className="flex items-center justify-between gap-(--space-2xs)">
          <p className="type-drawing-label text-drawing-text truncate">
            {typeLabel}
          </p>
          {/* The real SKU as written in the catalogue — the one identifier a
              card can carry that a maker would actually quote back. Dropped
              on mobile: a 156px card cannot hold both, and there the category
              would clip mid-word to make room for a reference code. */}
          <CoordinateLabel className="hidden shrink-0 sm:block">
            {product.sku}
          </CoordinateLabel>
        </div>
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
          <p className="type-caption text-text-muted flex items-center gap-(--space-3xs)">
            {/* The same palette chip the colour selector uses for the custom
                option, so "this can be made in your colour" is one mark across
                the site rather than a card-only invention. */}
            <span
              aria-hidden="true"
              className="border-drawing-line size-2.5 shrink-0 border"
              style={{
                backgroundImage:
                  "conic-gradient(from 90deg, #d98c8c, #d9c48c, #a9d98c, #8cb8d9, #b08cd9, #d98c8c)",
              }}
            />
            {cardCopy.customColourAvailable}
          </p>
        ) : null}
      </div>
    </Link>
  );
}
