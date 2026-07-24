import type { ReactNode } from "react";
import { cn } from "@/lib/cn";

/** Named aspect ratios from IMAGE_REQUIREMENTS.md / BRAND_VISUAL_GUIDE §7.5. */
const ratioClass = {
  "hero-landscape": "aspect-[21/9]",
  "hero-portrait": "aspect-[4/5]",
  "editorial-landscape": "aspect-[16/9]",
  "editorial-portrait": "aspect-[4/5]",
  square: "aspect-square",
  "product-card": "aspect-square",
  "product-gallery": "aspect-square",
  "project-cinematic": "aspect-[21/9]",
  "colour-sample": "aspect-square",
  "process-detail": "aspect-[3/2]",
} as const;

export type MediaRatio = keyof typeof ratioClass;

export function MediaFrame({
  ratio = "square",
  fit = "cover",
  caption,
  credit,
  className,
  children,
}: {
  ratio?: MediaRatio;
  fit?: "cover" | "contain";
  caption?: ReactNode;
  credit?: { photographer?: string; project?: string; location?: string };
  className?: string;
  children: ReactNode;
}) {
  const creditLine = credit
    ? [credit.photographer, credit.project, credit.location]
        .filter(Boolean)
        .join(" — ")
    : null;

  return (
    <figure className={className}>
      <div
        className={cn(
          "bg-surface-muted relative overflow-hidden",
          ratioClass[ratio],
          fit === "contain" && "[&>img]:object-contain",
          fit === "cover" && "[&>img]:object-cover",
          "[&>img]:h-full [&>img]:w-full",
        )}
      >
        {children}
      </div>
      {caption || creditLine ? (
        <figcaption className="type-caption text-text-muted mt-(--space-2xs) flex justify-between gap-4">
          {caption ? <span>{caption}</span> : <span />}
          {creditLine ? <span>{creditLine}</span> : null}
        </figcaption>
      ) : null}
    </figure>
  );
}
