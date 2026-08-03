import type { Locale } from "@/i18n/config";
import type { Dictionary } from "@/i18n/get-dictionary";
import type { Product } from "@/lib/schemas/product";
import { ProductCard } from "@/components/product/product-card";
import { Skeleton } from "@/components/ui/skeleton";

/**
 * Catalog grid (Prompt 5 §8) — 2 columns on mobile (compact, matches the
 * "2 cols compact" mobile spec), 3 on tablet, 4 on desktop. One consistent
 * aspect ratio (via `ProductCard`'s `MediaFrame`, `ratio="product-card"`)
 * and equal gutters throughout; no heavy borders. The optional 2-col
 * editorial card and column-count toggle from §8 are not implemented — see
 * the Prompt 5 final report's "known limitations" section.
 */
export function ProductGrid({
  products,
  locale,
  dictionary,
}: {
  products: Product[];
  locale: Locale;
  dictionary: Dictionary;
}) {
  return (
    <div className="grid grid-cols-2 gap-x-(--space-sm) gap-y-(--space-lg) sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4">
      {products.map((product, index) => (
        <ProductCard
          key={product.slug}
          product={product}
          locale={locale}
          dictionary={dictionary}
          priority={index < 4}
          index={index}
        />
      ))}
    </div>
  );
}

/** Loading skeleton — matches `ProductCard`'s real geometry (square media
 * frame + three text lines) so nothing jumps once real cards mount. */
export function ProductGridSkeleton({ count = 8 }: { count?: number }) {
  return (
    <div
      role="status"
      aria-label="loading"
      className="grid grid-cols-2 gap-x-(--space-sm) gap-y-(--space-lg) sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4"
    >
      {Array.from({ length: count }, (_, index) => (
        <div key={index} className="flex flex-col gap-(--space-xs)">
          <Skeleton className="aspect-square w-full" />
          <Skeleton className="h-3 w-1/3" />
          <Skeleton className="h-4 w-2/3" />
          <Skeleton className="h-4 w-1/4" />
        </div>
      ))}
    </div>
  );
}
