import type { Dictionary } from "@/i18n/get-dictionary";
import type { Product } from "@/lib/schemas/product";
import { buildDescriptionSections } from "@/lib/product-description";
import {
  shopCategoryLabel,
  shopCategoryIntro,
} from "@/lib/shop-category-label";

export interface EditorialSection {
  id: "category" | "craft" | "colour";
  heading: string;
  body: string;
  photo?: string;
  photoAlt: string;
}

/**
 * Builds the product page's editorial sections — Prompt 6 §12 ("2–4
 * configurable sections... must NOT be identical across products").
 *
 * Every section here is built from real, already-established data, and
 * genuinely varies from product to product rather than repeating fixed
 * boilerplate:
 * - "category": the real per-category intro copy (`shop.categoryIntros`,
 *   already written for Prompt 5) — differs across the 7 real categories.
 * - "craft": the product's own real intro paragraph (`fullDesc`, via
 *   `buildDescriptionSections`) — unique per product by construction. This
 *   intentionally re-presents the same real sentence already shown in the
 *   structured description (§8) in a different, editorial layout; it is
 *   not a second invented fact.
 * - "colour": only rendered when the product genuinely has a real
 *   custom-colour variant — shows that variant's own real photo/label
 *   alongside the real, confirmed RAL/NCS colour-matching offer.
 *
 * There is no real lifestyle photography, "in your space" imagery, or
 * technical drawing anywhere in the source data (see `gallery-media.ts`),
 * so those editorial angles are deliberately not invented here — a
 * documented "needs real ODUDLAB data" gap.
 */
export function buildEditorialSections(
  product: Product,
  dictionary: Dictionary,
): EditorialSection[] {
  const sections: EditorialSection[] = [];

  sections.push({
    id: "category",
    heading: shopCategoryLabel(product.shopCategory, dictionary),
    body: shopCategoryIntro(product.shopCategory, dictionary),
    photo: product.base.photo,
    photoAlt: product.name,
  });

  const [intro] = buildDescriptionSections(product.base.description);
  if (intro) {
    sections.push({
      id: "craft",
      heading: dictionary.product.editorialCraftHeading,
      body: intro.text,
      photo: product.customColour?.photo ?? product.base.photo,
      photoAlt: product.name,
    });
  }

  if (product.customColour) {
    sections.push({
      id: "colour",
      heading: dictionary.product.editorialColourHeading,
      body: dictionary.product.trustColourMatching,
      photo: product.customColour.photo,
      photoAlt: product.customColour.colorLabel ?? product.name,
    });
  }

  return sections;
}
