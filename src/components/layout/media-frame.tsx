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
  /**
   * The native frame of a camera photographing a finished site — and, more to
   * the point, the native frame of the project photographs actually on file.
   * A 4:3 source shown at `project-cinematic` loses a third of its height to
   * `object-cover`, and on this kind of picture the thirds that go are the
   * building above and the paving below: exactly the context that proves the
   * piece is installed somewhere real. Height is capped with
   * `maxViewportHeight` instead, which narrows rather than crops.
   */
  "project-documentary": "aspect-[4/3]",
  "colour-sample": "aspect-square",
  "process-detail": "aspect-[3/2]",
} as const;

/** The same ratios as numbers (width ÷ height), used to translate a height cap
 * into the width cap that produces it — see `maxViewportHeight`. */
const ratioValue = {
  "hero-landscape": 21 / 9,
  "hero-portrait": 4 / 5,
  "editorial-landscape": 16 / 9,
  "editorial-portrait": 4 / 5,
  square: 1,
  "product-card": 1,
  "product-gallery": 1,
  "project-cinematic": 21 / 9,
  "project-documentary": 4 / 3,
  "colour-sample": 1,
  "process-detail": 3 / 2,
} as const;

export type MediaRatio = keyof typeof ratioClass;

export function MediaFrame({
  ratio = "square",
  fit = "cover",
  caption,
  credit,
  className,
  maxViewportHeight,
  children,
}: {
  ratio?: MediaRatio;
  fit?: "cover" | "contain";
  caption?: ReactNode;
  credit?: { photographer?: string; project?: string; location?: string };
  className?: string;
  /** Cap the frame's *height* at this fraction of the viewport, expressed as a
   * CSS length (e.g. `"62svh"`). A fixed aspect ratio makes a block's height a
   * function of its width, so the cap has to be applied as a width:
   * `min(100%, height × ratio)`. Below that threshold the frame still fills its
   * column exactly as before; past it the frame narrows and centres (`mx-auto`)
   * so the image stops growing taller than the screen.
   *
   * `svh` rather than `vh`: on mobile `vh` is the *largest* viewport, so a
   * `vh`-capped image overflows while the URL bar is showing. On desktop the
   * two are identical. */
  maxViewportHeight?: string;
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
          maxViewportHeight && "mx-auto",
          fit === "contain" && "[&>img]:object-contain",
          fit === "cover" && "[&>img]:object-cover",
          "[&>img]:h-full [&>img]:w-full",
        )}
        style={
          maxViewportHeight
            ? {
                width: `min(100%, calc(${maxViewportHeight} * ${ratioValue[ratio]}))`,
              }
            : undefined
        }
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
