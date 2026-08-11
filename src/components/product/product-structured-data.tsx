import type { Locale } from "@/i18n/config";
import type { Dictionary } from "@/i18n/get-dictionary";
import type { Product, ProductVariant } from "@/lib/schemas/product";
import { localeHref } from "@/lib/locale-href";
import { getSiteUrl } from "@/lib/site-url";
import { buildProductJsonLd } from "@/lib/product-structured-data";
import { shopCategoryLabel } from "@/lib/shop-category-label";
import { serializeJsonLd } from "@/lib/json-ld";

/**
 * Renders the product page's Product JSON-LD (Prompt 6 §15), mirroring
 * `HomeStructuredData`'s `<script type="application/ld+json">` pattern —
 * same `getSiteUrl()`/`dictionary.site.name` sourcing, same
 * `dangerouslySetInnerHTML={{ __html: JSON.stringify(...) }}` rendering.
 */
export function ProductStructuredData({
  product,
  variant,
  locale,
  dictionary,
}: {
  product: Product;
  variant: ProductVariant;
  locale: Locale;
  dictionary: Dictionary;
}) {
  const siteUrl = getSiteUrl().toString();
  const path = localeHref(locale, `/products/${product.slug}`);
  const json = buildProductJsonLd({
    product,
    variant,
    siteUrl,
    path,
    brandName: dictionary.site.name,
    // The same helper the breadcrumb uses, so the category Google reads and
    // the category the visitor reads can never drift apart.
    categoryName: shopCategoryLabel(product.shopCategory, dictionary),
    // The same string the Customer Care block already shows the visitor, so
    // the shipping option Google reads is worded identically — and translated,
    // which a hardcoded "Самовивіз" in the generator would not be.
    pickupLabel: dictionary.customerCare.deliveryPickup,
    shippingSettingsPath: localeHref(locale, "/payment-delivery"),
  });

  return (
    <script
      type="application/ld+json"
      dangerouslySetInnerHTML={{ __html: serializeJsonLd(json) }}
    />
  );
}
