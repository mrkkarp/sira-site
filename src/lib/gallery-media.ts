import type { Product, ProductVariant } from "@/lib/schemas/product";

export type GalleryMediaType = "photo" | "video" | "3d";

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
 * The Horoshop "Галерея" export carries an ordered set of real product
 * photos per row (up to 8), preserved as `variant.gallery`. This returns
 * every one of them, in source order, so the PDP gallery renders the full
 * shoot rather than just the main shot. There is still no lifestyle
 * photography, technical drawing, video, or 3D asset in the source — only
 * real product photos (see `IMAGE_REQUIREMENTS.md`), so every item is typed
 * `"photo"`.
 *
 * On colour change: the gallery switches to the selected variant's own
 * ordered photos. It falls back to the base variant's gallery, then to the
 * single `photo`, rather than ever rendering a broken image.
 */
export function buildGalleryMedia(
  product: Product,
  variant: ProductVariant,
): GalleryMediaItem[] {
  const variantGallery = variant.gallery ?? [];
  const baseGallery = product.base.gallery ?? [];
  const sources =
    variantGallery.length > 0
      ? variantGallery
      : baseGallery.length > 0
        ? baseGallery
        : [variant.photo || product.base.photo];
  return sources.map((src) => ({ type: "photo", src, alt: product.name }));
}
