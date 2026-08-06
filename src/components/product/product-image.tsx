"use client";

import { useState } from "react";
import Image from "next/image";
import { cn } from "@/lib/cn";

// Prompt 9 §5 (performance audit) — a 1×1 solid-color PNG data URL matching
// `--color-surface-muted` (`#e7e2d9`, see globals.css), used as the `blur`
// placeholder below. These are remote images (not static imports), so
// Next.js can't auto-generate a real LQIP blurDataURL from the actual photo
// — a solid brand-neutral color is the honest, non-fabricated stand-in
// (see the Next.js docs' own "generate a solid color Data URL" suggestion),
// just smoothing the pop-in instead of a flash of empty/white space.
const BLUR_DATA_URL =
  "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAIAAACQd1PeAAAADElEQVR4nGN4/ugmAAVWAqPjAZbrAAAAAElFTkSuQmCC";

/**
 * Thin client wrapper around `next/image` that swaps to a neutral text
 * fallback on load failure (broken source URL, deleted asset, etc.) instead
 * of leaving the browser's default broken-image icon — Prompt 5 §12
 * ("broken image" state). Kept as its own small client island so
 * `ProductCard` itself can stay a server component.
 */
type CommonProps = {
  src: string;
  alt: string;
  priority?: boolean;
  className?: string;
  brokenLabel: string;
};

/**
 * Exactly one of the two sizing strategies, never both and never neither.
 *
 * A plain `sizes?: string; fixedSize?: number` would type-check a call that
 * passes neither, and that call renders a `fill` image with no `sizes` — which
 * Next only complains about at runtime, in the browser console, on a component
 * every product photograph goes through. The union makes it a build error.
 */
type SizingProps =
  | {
      /** How the box scales with the viewport, for images that do. */
      sizes: string;
      fixedSize?: never;
    }
  | {
      sizes?: never;
      /**
       * The largest CSS pixel size this image's box is ever rendered at, for
       * the images whose box does *not* grow with the viewport — the gallery
       * thumbnail rail and the colour swatches.
       *
       * Those two are the site's most numerous images and were its most
       * wasteful. `fill` requires `sizes`, and Next builds the `srcset` of any
       * `sizes`-bearing image from the entire configured width list regardless
       * of how small `sizes` says the image is: a 40 px swatch was advertising
       * a 2560 px candidate, and an eight-frame gallery was publishing eighty
       * URLs for its thumbnails alone. Anything that walks a `srcset` — an
       * image crawler, a scraper — could bill every one of them, and Vercel
       * charges per unique variant.
       *
       * Passing intrinsic `width`/`height` instead, with no `sizes`, makes
       * Next emit exactly two candidates (1× and 2×). Ten widths become two.
       * The box is still sized by CSS (`h-full w-full` below), so nothing
       * moves on screen — these numbers only tell Next which files may be
       * asked for.
       */
      fixedSize: number;
    };

export function ProductImage({
  src,
  alt,
  priority,
  sizes,
  fixedSize,
  className,
  brokenLabel,
}: CommonProps & SizingProps) {
  const [broken, setBroken] = useState(false);

  if (broken) {
    return (
      <div className="bg-surface-muted flex h-full w-full items-center justify-center px-(--space-sm) text-center">
        <span className="type-caption text-text-muted">{brokenLabel}</span>
      </div>
    );
  }

  // `alt` stays out of this and is written at each call below: spreading it
  // hides it from `jsx-a11y/alt-text`, which then reports both branches as
  // missing it. Losing the rule to silence its own false positive would be a
  // bad trade on the component every product photograph goes through.
  const shared = {
    src,
    priority,
    onError: () => setBroken(true),
    placeholder: "blur" as const,
    blurDataURL: BLUR_DATA_URL,
  };

  // Square because both callers are square boxes cropping with `object-cover`
  // (or letterboxing a drawing with `object-contain`); the real aspect ratio
  // is handled by the CSS, not by these attributes.
  if (fixedSize !== undefined) {
    return (
      <Image
        {...shared}
        alt={alt}
        width={fixedSize}
        height={fixedSize}
        className={cn("h-full w-full", className)}
      />
    );
  }

  return (
    <Image {...shared} alt={alt} fill sizes={sizes} className={className} />
  );
}
