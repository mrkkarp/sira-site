import type { Product, ProductVariant } from "@/lib/schemas/product";

export type GalleryMediaType = "photo" | "drawing" | "video" | "3d";

export interface GalleryMediaItem {
  type: GalleryMediaType;
  src: string;
  alt: string;
  /** Real photo credit/caption text — omitted everywhere, since the source
   * export doesn't carry either field. Never fabricate one. */
  caption?: string;
  credit?: string;
}

/**
 * Builds the real gallery media list for a resolved variant.
 *
 * The Horoshop "Галерея" export carries an ordered set of real product images
 * per row (up to 8), preserved as `variant.gallery`. It also carried, mixed in
 * among them and indistinguishable, 17 dimensioned technical drawings — line
 * elevations with millimetre annotations, sitting last in 12 of the galleries.
 * They are now recorded as such on the `Media` collection (`kind: "drawing"`,
 * set by an editor, not guessed from the filename) and arrive here already
 * separated, in `variant.drawings`.
 *
 * Photographs come first and drawings after, so the opening frame — the one
 * that acts as the product's portrait — is always a photograph. The drawings
 * are still worth showing: a buyer wants the millimetres. They are typed
 * `"drawing"` so the gallery can label them instead of passing them off as
 * another view of the object.
 *
 * There is genuinely no lifestyle photography, video or 3D asset in the source
 * (see `IMAGE_REQUIREMENTS.md`), so the other two types never appear yet.
 *
 * On colour change: the gallery switches to the selected variant's own ordered
 * photos. It falls back to the base variant's gallery, then to the single
 * `photo`, rather than ever rendering a broken image.
 */
export function buildGalleryMedia(
  product: Product,
  variant: ProductVariant,
): GalleryMediaItem[] {
  const variantGallery = variant.gallery ?? [];
  const baseGallery = product.base.gallery ?? [];
  const photos =
    variantGallery.length > 0
      ? variantGallery
      : baseGallery.length > 0
        ? baseGallery
        : [variant.photo || product.base.photo];
  const drawings = variant.drawings ?? product.base.drawings ?? [];

  return [
    ...photos.map((src): GalleryMediaItem => ({
      type: "photo",
      src,
      alt: product.name,
    })),
    ...drawings.map((src): GalleryMediaItem => ({
      type: "drawing",
      src,
      alt: product.name,
    })),
  ];
}
