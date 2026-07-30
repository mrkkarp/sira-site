"use client";

import { useState } from "react";
import Image from "next/image";

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
export function ProductImage({
  src,
  alt,
  priority,
  sizes,
  className,
  brokenLabel,
}: {
  src: string;
  alt: string;
  priority?: boolean;
  sizes: string;
  className?: string;
  brokenLabel: string;
}) {
  const [broken, setBroken] = useState(false);

  if (broken) {
    return (
      <div className="bg-surface-muted flex h-full w-full items-center justify-center px-(--space-sm) text-center">
        <span className="type-caption text-text-muted">{brokenLabel}</span>
      </div>
    );
  }

  return (
    <Image
      src={src}
      alt={alt}
      fill
      sizes={sizes}
      priority={priority}
      className={className}
      onError={() => setBroken(true)}
      placeholder="blur"
      blurDataURL={BLUR_DATA_URL}
    />
  );
}
