import type { EditorialSection } from "@/lib/editorial-sections";
import { cn } from "@/lib/cn";
import { MediaFrame } from "@/components/layout/media-frame";
import { ProductImage } from "@/components/product/product-image";

/**
 * Renders the product page's editorial sections (Prompt 6 §12), alternating
 * image side left/right by index for visual rhythm — purely presentational,
 * all real content/photos come from `buildEditorialSections`.
 *
 * ## Why the frame is portrait, capped and uncropped
 *
 * These sections used to run a 16:9 `editorial-landscape` frame filled with
 * `object-cover`. The catalogue is 93 portrait / 24 square / 6 landscape
 * photographs with a median aspect of 7:8, so a 16:9 crop was throwing away
 * roughly 56 % of the height of a typical shot — you got a horizontal slice
 * through the middle of a washbasin. That is the "badly cropped" complaint,
 * and it was not a tuning problem: no crop rectangle turns a 7:8 photograph
 * into a good 16:9 one.
 *
 * So the frame now matches the source material (`editorial-portrait`, 4:5)
 * and does not crop at all (`fit="contain"`), which leaves only a hairline of
 * frame background on a typical portrait shot and letterboxes the handful of
 * landscape ones rather than gutting them.
 *
 * A 4:5 frame filling a half-page column would be 830 px tall on a 1440 px
 * screen — worse than what it replaced — so it is capped at 58svh and centres
 * in its column. Height, not column width, is what decides how big an image
 * feels.
 */
export function ProductEditorial({
  sections,
  brokenImageLabel,
}: {
  sections: EditorialSection[];
  brokenImageLabel: string;
}) {
  if (sections.length === 0) return null;

  return (
    <div className="flex flex-col gap-(--space-lg)">
      {sections.map((section, index) => {
        const imageFirst = index % 2 === 0;
        const textBlock = (
          <div className="flex flex-col justify-center gap-(--space-2xs)">
            <h2 className="type-h3 text-text">{section.heading}</h2>
            <p className="type-body text-text-muted">{section.body}</p>
          </div>
        );
        const imageBlock = section.photo ? (
          <MediaFrame
            ratio="editorial-portrait"
            fit="contain"
            maxViewportHeight="58svh"
          >
            <ProductImage
              src={section.photo}
              alt={section.photoAlt}
              sizes="(min-width: 1024px) 33vw, 100vw"
              brokenLabel={brokenImageLabel}
            />
          </MediaFrame>
        ) : null;

        return (
          <div
            key={section.id}
            className={cn(
              "grid gap-(--space-sm)",
              // A two-column grid holding one child leaves half the row empty.
              // Sections with no honest photograph to show are prose, so they
              // run as a single measured column instead — the same 3xl the
              // description and the specs accordion above them use.
              //
              // `w-full` is load-bearing: these rows are items in a flex
              // column, where `mx-auto` overrides the default stretch and
              // collapses the row to its max-content width (measured: 287px).
              // A definite width basis is what lets `max-w-3xl` cap it and
              // `mx-auto` centre it.
              imageBlock
                ? "lg:grid-cols-2 lg:items-center"
                : "mx-auto w-full max-w-3xl",
            )}
          >
            {imageFirst ? (
              <>
                {imageBlock}
                {textBlock}
              </>
            ) : (
              <>
                {textBlock}
                {imageBlock}
              </>
            )}
          </div>
        );
      })}
    </div>
  );
}
