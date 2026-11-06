import type { Dictionary } from "@/i18n/get-dictionary";
import type { ProductSpecEntry } from "@/lib/schemas/product";
import {
  getDimensionSpecEntries,
  withoutDimensionSpecEntries,
} from "@/lib/product-dimensions";
import { ProductSpecs } from "@/components/product/product-specs";
import { ProductDimensions } from "@/components/product/product-dimensions";

/**
 * Dimensions and specifications, open, directly under the product.
 *
 * They used to live in two collapsed accordion panels below the description,
 * so a visitor had to scroll past the prose and click before learning whether
 * a basin fits the wall it is meant for. The owner (2026-11-06): «розміри і
 * характеристики мають чітко дивитися одразу після продукту». Size is the
 * first thing a buyer of a concrete object checks — it decides whether the
 * piece fits, and the weight whether the floor and the delivery can take it —
 * so it is now read before anything else, with nothing to open.
 *
 * Measured axes are drawn as the dimension figure (see `ProductDimensions`);
 * every other entry — weight, volume, material, drainage, mounting — is the
 * numbered specification table. A product with no entries at all renders
 * nothing rather than an empty heading.
 */
export function ProductSpecSheet({
  specEntries,
  dictionary,
}: {
  specEntries: ProductSpecEntry[];
  dictionary: Dictionary;
}) {
  if (specEntries.length === 0) return null;

  const copy = dictionary.product;
  const dimensions = getDimensionSpecEntries(specEntries);
  const specs = withoutDimensionSpecEntries(specEntries);

  return (
    <section aria-labelledby="product-spec-sheet">
      <h2 id="product-spec-sheet" className="type-h2 text-text">
        {copy.specSheetHeading}
      </h2>
      <div className="mt-(--space-md) grid gap-(--space-lg) md:grid-cols-2">
        {dimensions.length > 0 ? (
          <div>
            <h3 className="type-eyebrow text-text-muted">
              {copy.accordionDimensions}
            </h3>
            <div className="mt-(--space-sm)">
              <ProductDimensions entries={dimensions} />
            </div>
          </div>
        ) : null}
        {specs.length > 0 ? (
          <div>
            <h3 className="type-eyebrow text-text-muted">
              {copy.accordionSpecs}
            </h3>
            <div className="mt-(--space-sm)">
              <ProductSpecs specEntries={specs} />
            </div>
          </div>
        ) : null}
      </div>
    </section>
  );
}
