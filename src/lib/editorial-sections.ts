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
 *   custom-colour variant.
 *
 * ## Which photograph each section gets
 *
 * Every section used to be handed `product.base.photo` — the same image the
 * gallery is already showing full-size at the top of the page. On
 * `/products/square-nakladna` that put one photograph on screen four times:
 * the gallery's active view, its own thumbnail, and then again 1 700 px
 * further down. Three sections captioned "Умивальники", "Ідея та матеріал"
 * and "Колір під замовлення" showing one identical picture reads as filler,
 * because it is.
 *
 * So photographs are *allocated*, not repeated:
 *
 *  - the custom-colour section takes the custom variant's own photograph, and
 *    only when the admin actually attached one. When the custom colourway has
 *    no photograph of its own — which is almost all of them — the section
 *    runs as text. We have no picture of this piece in your colour; showing
 *    the grey one under that heading would be a claim, not an illustration.
 *  - the remaining sections draw the next unused image from the product's own
 *    gallery, starting at index 1, so each one is a genuinely different view
 *    and none of them repeats the hero. `gallery` is photographs only —
 *    dimensioned drawings travel separately in `drawings` — so a line drawing
 *    can no longer end up as the picture beside "Ідея та матеріал", which is
 *    where several of them used to land.
 *  - a section that runs out of images renders text-only. `ProductEditorial`
 *    has always supported that; it is the correct outcome for the 17 rows
 *    whose export carries a single photograph.
 *
 * There is still no lifestyle or "in your space" photography in the source
 * data, so those editorial angles are deliberately not invented here — a
 * documented "needs real ODUDLAB data" gap.
 */
export function buildEditorialSections(
  product: Product,
  dictionary: Dictionary,
): EditorialSection[] {
  const sections: EditorialSection[] = [];

  // Index 0 is the hero the gallery opens on, so it is never handed out here.
  const spare = (product.base.gallery ?? []).slice(1);
  let next = 0;
  const nextPhoto = () => spare[next++];

  sections.push({
    id: "category",
    heading: shopCategoryLabel(product.shopCategory, dictionary),
    body: shopCategoryIntro(product.shopCategory, dictionary),
    photo: nextPhoto(),
    photoAlt: product.name,
  });

  const [intro] = buildDescriptionSections(product.base.description);
  if (intro) {
    sections.push({
      id: "craft",
      heading: dictionary.product.editorialCraftHeading,
      body: intro.text,
      photo: nextPhoto(),
      photoAlt: product.name,
    });
  }

  if (product.customColour) {
    const customPhoto = product.customColour.photo;
    sections.push({
      id: "colour",
      heading: dictionary.product.editorialColourHeading,
      body: dictionary.product.trustColourMatching,
      // Distinct from the base photo means an admin attached a real photo of
      // this colourway; equal to it means the adapter fell back to the base
      // image, which is not a picture of a custom colour.
      photo:
        customPhoto && customPhoto !== product.base.photo
          ? customPhoto
          : undefined,
      photoAlt: product.customColour.colorLabel ?? product.name,
    });
  }

  return sections;
}
