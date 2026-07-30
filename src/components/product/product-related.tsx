import type { Locale } from "@/i18n/config";
import type { Dictionary } from "@/i18n/get-dictionary";
import type { RelatedProductsSection } from "@/lib/related-products";
import { ProductCard } from "@/components/product/product-card";

/**
 * Renders the product page's related-products rail (Prompt 6 §13). Pure
 * presentation over whatever `pickRelatedProducts` already picked — the
 * heading text is looked up from the real dictionary key that matches the
 * tier that won, and the grid reuses the existing `ProductCard` (same one
 * used on the homepage/shop grid) rather than inventing a second card
 * layout. Renders nothing if no tier produced any real candidates.
 */
export function ProductRelated({
  section,
  locale,
  dictionary,
}: {
  section: RelatedProductsSection | undefined;
  locale: Locale;
  dictionary: Dictionary;
}) {
  if (!section || section.products.length === 0) return null;

  return (
    <section className="flex flex-col gap-(--space-sm)">
      <h2 className="type-h3 text-text">
        {dictionary.product[section.headingKey]}
      </h2>
      <div className="grid grid-cols-2 gap-(--space-sm) lg:grid-cols-4">
        {section.products.map((product, index) => (
          <ProductCard
            key={product.slug}
            product={product}
            locale={locale}
            dictionary={dictionary}
            priority={index === 0}
          />
        ))}
      </div>
    </section>
  );
}
