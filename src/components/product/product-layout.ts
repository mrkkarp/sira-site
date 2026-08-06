/**
 * The two measurements that set the shape of the product page's top block —
 * shared by the page itself and by the Suspense fallback that stands in for it
 * (`src/app/[locale]/products/[slug]/loading.tsx`).
 *
 * They live here rather than at either use site because a loading skeleton is
 * only worth having while it is the *same shape* as the thing it replaces. The
 * route is server-rendered per request, so every visit to a product renders the
 * fallback first and then swaps the real page in; if the two disagree about the
 * grid or the gallery's width, that swap moves every element on the screen at
 * once, which is the jolt the skeleton was supposed to prevent. A constant that
 * can only be changed in one place is what keeps them from drifting apart.
 */

/**
 * The gallery/info split.
 *
 * The gallery column was a flat `3fr`, which on a 1440×751 laptop made it
 * 755 px wide — and a square photo 755 px wide is 755 px tall, taller than the
 * viewport. Capping the photo alone would have left a few hundred pixels of
 * dead space beside it, so the cap lives on the *column*:
 * `min(60%, <height budget>)`. On a tall screen 60% wins and the split is the
 * old 3fr/2fr; on a short one the height budget wins, the gallery narrows, and
 * the info column absorbs the difference instead of the layout growing a hole.
 */
export const PRODUCT_GRID_CLASS =
  "lg:grid lg:grid-cols-[minmax(0,min(60%,calc(100svh-var(--header-stack-height,74px)-9rem)))_minmax(0,1fr)] lg:items-start lg:gap-x-(--space-lg)";

/** Height budget for the gallery's active photo.
 *
 * The gallery used to be `w-full` inside a ~755 px column, so on a 1440×751
 * laptop the square photo was 755 px tall — taller than the viewport on its
 * own, before the header, the annotation band and the thumbnail strip were
 * counted. You could never see a photo and its thumbnails at the same time,
 * which is exactly what makes switching between them feel awkward.
 *
 * So the photo is capped by *height*, not width. A square frame's height
 * equals its width, so the cap is written as a `max-width` on the whole
 * column — the frame, the annotation band and the thumbnails then share one
 * measure and stay aligned. `min(100%, …)` keeps the old behaviour whenever
 * the column is the narrower constraint, which is every phone in portrait:
 * this is a desktop fix that is inert on mobile.
 *
 * The subtracted 9rem is everything the gallery itself puts below the photo —
 * the annotation band, the thumbnail row, and the gaps between them — so the
 * whole gallery fits one screen under the header. It deliberately does *not*
 * also subtract the breadcrumbs and the section's top padding: demanding that
 * those fit too would shrink the photo by another 130 px to save the reader a
 * gesture they were going to make anyway. `--header-stack-height` is published
 * by the header itself. `svh` rather than `vh` so a mobile URL bar can't push
 * the photo off-screen. */
export const GALLERY_MAX_WIDTH =
  "min(100%, calc(100svh - var(--header-stack-height, 74px) - 9rem))";
