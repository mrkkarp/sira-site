import { Container, Section } from "@/components/layout";
import { Skeleton } from "@/components/ui/skeleton";
import {
  GALLERY_MAX_WIDTH,
  PRODUCT_GRID_CLASS,
} from "@/components/product/product-layout";
import { DrawingFrame, TechnicalLine } from "@/components/technical-drawing";

/**
 * Loading state for `/products/[slug]`.
 *
 * ## Why this file exists
 *
 * The product route is rendered per request — it has no `generateStaticParams`
 * and it awaits `searchParams` (to restore a shared `?colour=…` link
 * server-side), so it can only be partially prefetched: the router fetches the
 * Suspense fallback ahead of the click and the page itself after it. Every
 * visit therefore shows a fallback for as long as the render takes, and until
 * now that fallback was the generic one at `src/app/[locale]/loading.tsx` — a
 * centred `max-w-3xl` article column: one narrow heading, a couple of text
 * lines, one grey block.
 *
 * The product page is nothing like that. It is a full-width two-column grid
 * with a square photo on the left and the price/colours/CTA panel on the
 * right. So the swap moved *everything*: the column jumped from ~768 px to the
 * full 1600 px measure, and a block in the middle of the screen became a photo
 * and a panel. That is the "різкий неприємний перехід" — not a missing
 * animation, a change of layout. Animating it would only have made it longer.
 *
 * A skeleton's whole job is to occupy the same space as what replaces it, so
 * this one shares the page's two load-bearing measurements with
 * `ProductExperience` via `product-layout.ts` rather than restating them: the
 * grid template and the gallery's width budget. The bar heights are line-box
 * approximations (a heading's own height is a `clamp()` that moves with the
 * viewport); the geometry that actually decides where things sit — the
 * container, the two columns, the square frame, the thumbnail row — is exact.
 *
 * The frame is drawn rather than greyed out: the registration ticks and the
 * annotation rule are the sheet, and the sheet is not what we are waiting for.
 * It reads as a drawing with the view not yet placed on it, which is the
 * honest description of the state.
 *
 * `min-h-screen`, as on the generic skeleton, so the footer doesn't jump up
 * under the header for the duration of the fetch — the real page is several
 * screens tall.
 */
export default function Loading() {
  return (
    <Section spacing="lg" className="min-h-screen">
      <Container className="flex flex-col gap-(--space-lg)">
        {/* Breadcrumbs: home / category / product. */}
        <div className="flex flex-wrap items-center gap-(--space-3xs)">
          <Skeleton className="h-[1.05rem] w-16" />
          <Skeleton className="h-[1.05rem] w-28" />
          <Skeleton className="h-[1.05rem] w-20" />
        </div>

        <div className={PRODUCT_GRID_CLASS}>
          {/* Gallery column — mirrors `ProductGallery`: framed square view,
              annotation band over its rule, then the thumbnail strip. Four
              thumbnails is a stand-in for a count we can't know yet; they wrap
              on one row at any real count, so the height is right regardless. */}
          <div>
            <div
              className="flex flex-col gap-(--space-xs)"
              style={{ maxWidth: GALLERY_MAX_WIDTH }}
            >
              <DrawingFrame className="p-(--space-2xs)">
                <Skeleton className="aspect-square w-full" />
              </DrawingFrame>

              <div>
                <div className="flex items-end justify-between gap-(--space-sm) pb-(--space-3xs)">
                  <Skeleton className="h-[0.95rem] w-24" />
                  <Skeleton className="h-[0.95rem] w-12" />
                </div>
                <TechnicalLine />
              </div>

              <div className="flex flex-wrap gap-(--space-2xs)">
                {[0, 1, 2, 3].map((index) => (
                  <Skeleton key={index} className="h-16 w-16 lg:h-20 lg:w-20" />
                ))}
              </div>
            </div>
          </div>

          {/* Info column — `ProductCoreInfo`, `ColourSelector`, the CTA and
              `ProductTrustDetails`, in that order and at those gaps. Not
              `sticky`: nothing scrolls past it while it is on screen. */}
          <div className="mt-(--space-md) flex flex-col gap-(--space-sm) lg:mt-0 lg:pb-(--space-md)">
            <div className="flex flex-col gap-(--space-2xs)">
              <Skeleton className="h-[1.05rem] w-28" />
              <Skeleton className="h-[2.2rem] w-3/4" />
              <Skeleton className="h-6 w-32" />
              <Skeleton className="h-6 w-36" />
              <div className="flex flex-col gap-(--space-3xs)">
                <Skeleton className="h-[1.36rem] w-40" />
                <Skeleton className="h-[1.36rem] w-48" />
              </div>
            </div>

            <div className="flex flex-col gap-(--space-xs)">
              <Skeleton className="h-[1.05rem] w-24" />
              <div className="grid gap-(--space-2xs) sm:grid-cols-[repeat(auto-fit,minmax(12rem,1fr))]">
                {[0, 1].map((index) => (
                  <div
                    key={index}
                    className="border-drawing-line-subtle flex flex-col gap-(--space-3xs) border p-(--space-xs)"
                  >
                    <span className="flex items-center gap-(--drawing-gap)">
                      <Skeleton className="size-(--drawing-marker-size) rounded-full" />
                      <Skeleton className="h-[0.95rem] w-24" />
                    </span>
                    <span
                      aria-hidden="true"
                      className="bg-drawing-line-subtle block h-(--drawing-stroke) w-full"
                    />
                    <span className="flex items-center gap-(--space-xs)">
                      <Skeleton className="h-10 w-10 shrink-0" />
                      <span className="flex min-w-0 flex-1 flex-col gap-(--space-3xs)">
                        <Skeleton className="h-[1.36rem] w-3/5" />
                        <Skeleton className="h-[0.95rem] w-2/5" />
                      </span>
                    </span>
                  </div>
                ))}
              </div>
            </div>

            <Skeleton className="h-11 w-48" />

            <div className="flex flex-col gap-(--space-3xs)">
              <Skeleton className="h-[1.36rem] w-44" />
              <Skeleton className="h-[1.36rem] w-56" />
              <Skeleton className="h-[1.36rem] w-52" />
            </div>
          </div>
        </div>
      </Container>
    </Section>
  );
}
