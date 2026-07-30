"use client";

import { useEffect, useRef, useState } from "react";
import type { TouchEvent } from "react";
import type { Dictionary } from "@/i18n/get-dictionary";
import { formatTemplate } from "@/lib/format-template";
import type { GalleryMediaItem } from "@/lib/gallery-media";
import { ProductImage } from "@/components/product/product-image";
import { DialogPrimitive } from "@/components/ui/dialog-primitive";
import { IconButton } from "@/components/ui/icon-button";
import { cn } from "@/lib/cn";

const SWIPE_THRESHOLD_PX = 40;

function ArrowIcon({ direction }: { direction: "left" | "right" }) {
  return (
    <svg aria-hidden="true" viewBox="0 0 24 24" className="h-4 w-4">
      <path
        d={direction === "left" ? "M15 6l-6 6 6 6" : "M9 6l6 6-6 6"}
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
      />
    </svg>
  );
}

/**
 * Product gallery (Prompt 6 §2). Supports any number of real media items
 * (today, that's always exactly one real photo per variant — see
 * `buildGalleryMedia` — but nothing here assumes that won't grow). Large
 * active photo + thumbnail strip (not a tiny carousel), keyboard-navigable
 * thumbnails, swipe on touch, a focus-trapping fullscreen lightbox, and a
 * counter. Broken images never show a broken-image icon — `ProductImage`
 * swaps to a labelled fallback instead.
 */
export function ProductGallery({
  media,
  brokenImageLabel,
  dictionary,
}: {
  media: GalleryMediaItem[];
  brokenImageLabel: string;
  dictionary: Dictionary;
}) {
  const [activeIndex, setActiveIndex] = useState(0);
  const [lightboxOpen, setLightboxOpen] = useState(false);
  const touchStartX = useRef<number | null>(null);

  // Reset to the first item whenever the underlying media set changes (e.g.
  // a colour change swaps to that variant's own photos) — the sanctioned
  // "adjust state during render" pattern, not a ref (see React docs "You
  // Might Not Need an Effect").
  const mediaKey = media.map((item) => item.src).join("|");
  const [prevMediaKey, setPrevMediaKey] = useState(mediaKey);
  if (mediaKey !== prevMediaKey) {
    setPrevMediaKey(mediaKey);
    setActiveIndex(0);
  }

  const safeIndex = Math.min(activeIndex, media.length - 1);
  const active = media[safeIndex];

  function goTo(index: number) {
    setActiveIndex(((index % media.length) + media.length) % media.length);
  }

  function handleKeyDown(event: React.KeyboardEvent) {
    if (event.key === "ArrowRight") {
      event.preventDefault();
      goTo(safeIndex + 1);
    } else if (event.key === "ArrowLeft") {
      event.preventDefault();
      goTo(safeIndex - 1);
    }
  }

  function handleTouchStart(event: TouchEvent) {
    touchStartX.current = event.touches[0]?.clientX ?? null;
  }

  function handleTouchEnd(event: TouchEvent) {
    if (touchStartX.current == null) return;
    const endX = event.changedTouches[0]?.clientX ?? touchStartX.current;
    const delta = endX - touchStartX.current;
    touchStartX.current = null;
    if (Math.abs(delta) < SWIPE_THRESHOLD_PX) return;
    goTo(delta > 0 ? safeIndex - 1 : safeIndex + 1);
  }

  useEffect(() => {
    if (!lightboxOpen) return;
    function handleGlobalKeyDown(event: KeyboardEvent) {
      if (event.key === "ArrowRight") goTo(safeIndex + 1);
      if (event.key === "ArrowLeft") goTo(safeIndex - 1);
    }
    document.addEventListener("keydown", handleGlobalKeyDown);
    return () => document.removeEventListener("keydown", handleGlobalKeyDown);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [lightboxOpen, safeIndex, media.length]);

  if (!active) return null;

  return (
    <div className="flex flex-col gap-(--space-xs)">
      <div
        data-testid="gallery-active"
        className="bg-surface-muted relative aspect-square w-full"
        onTouchStart={handleTouchStart}
        onTouchEnd={handleTouchEnd}
      >
        {active.type === "video" ? (
          <video
            src={active.src}
            controls
            className="h-full w-full object-cover"
            aria-label={active.alt}
          />
        ) : (
          <button
            type="button"
            onClick={() => setLightboxOpen(true)}
            aria-label={dictionary.product.galleryOpenLightbox}
            className="absolute inset-0 h-full w-full"
          >
            <ProductImage
              src={active.src}
              alt={active.alt}
              priority
              sizes="(min-width: 1024px) 60vw, 100vw"
              className="object-cover"
              brokenLabel={brokenImageLabel}
            />
          </button>
        )}

        {media.length > 1 ? (
          <div className="absolute inset-x-0 bottom-(--space-sm) flex items-center justify-center gap-(--space-2xs)">
            <span className="type-caption bg-background/80 text-text px-(--space-2xs) py-(--space-3xs)">
              {formatTemplate(dictionary.product.galleryCounter, {
                current: safeIndex + 1,
                total: media.length,
              })}
            </span>
          </div>
        ) : null}
      </div>

      {media.length > 1 ? (
        <div
          role="listbox"
          aria-label={dictionary.product.galleryLabel}
          className="flex flex-wrap gap-(--space-2xs)"
          onKeyDown={handleKeyDown}
        >
          {media.map((item, index) => (
            <button
              key={item.src + index}
              type="button"
              role="option"
              aria-selected={index === safeIndex}
              aria-label={formatTemplate(
                dictionary.product.galleryThumbnailAlt,
                {
                  index: index + 1,
                },
              )}
              onClick={() => goTo(index)}
              className={cn(
                "bg-surface-muted relative h-16 w-16 shrink-0 overflow-hidden border",
                index === safeIndex ? "border-text" : "border-transparent",
              )}
            >
              <ProductImage
                src={item.src}
                alt={item.alt}
                sizes="64px"
                className="object-cover"
                brokenLabel={brokenImageLabel}
              />
            </button>
          ))}
        </div>
      ) : null}

      {lightboxOpen ? (
        <DialogPrimitive
          open={lightboxOpen}
          onClose={() => setLightboxOpen(false)}
          labelledBy="gallery-lightbox-title"
          className="flex items-center justify-center bg-black/90 p-(--space-sm)"
          panelClassName="relative h-full w-full max-w-5xl"
        >
          <h2 id="gallery-lightbox-title" className="sr-only">
            {active.alt}
          </h2>
          <IconButton
            aria-label={dictionary.product.galleryCloseLightbox}
            size="sm"
            className="bg-background absolute top-(--space-sm) right-(--space-sm) z-10"
            onClick={() => setLightboxOpen(false)}
            icon={
              <svg aria-hidden="true" viewBox="0 0 24 24" className="h-4 w-4">
                <path
                  d="M6 6l12 12M18 6L6 18"
                  stroke="currentColor"
                  strokeWidth="2"
                />
              </svg>
            }
          />
          <div className="relative h-full w-full">
            <ProductImage
              src={active.src}
              alt={active.alt}
              sizes="100vw"
              className="object-contain"
              brokenLabel={brokenImageLabel}
            />
          </div>
          {media.length > 1 ? (
            <>
              <IconButton
                aria-label={dictionary.product.galleryPrevious}
                size="sm"
                className="bg-background absolute top-1/2 left-(--space-sm) -translate-y-1/2"
                onClick={() => goTo(safeIndex - 1)}
                icon={<ArrowIcon direction="left" />}
              />
              <IconButton
                aria-label={dictionary.product.galleryNext}
                size="sm"
                className="bg-background absolute top-1/2 right-(--space-sm) -translate-y-1/2"
                onClick={() => goTo(safeIndex + 1)}
                icon={<ArrowIcon direction="right" />}
              />
              <span className="type-caption bg-background absolute bottom-(--space-sm) left-1/2 -translate-x-1/2 px-(--space-2xs) py-(--space-3xs)">
                {formatTemplate(dictionary.product.galleryCounter, {
                  current: safeIndex + 1,
                  total: media.length,
                })}
              </span>
            </>
          ) : null}
        </DialogPrimitive>
      ) : null}
    </div>
  );
}
