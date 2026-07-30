import type { EditorialSection } from "@/lib/editorial-sections";
import { MediaFrame } from "@/components/layout/media-frame";
import { ProductImage } from "@/components/product/product-image";

/**
 * Renders the product page's editorial sections (Prompt 6 §12), alternating
 * image side left/right by index for visual rhythm — purely presentational,
 * all real content/photos come from `buildEditorialSections`.
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
          <MediaFrame ratio="editorial-landscape">
            <ProductImage
              src={section.photo}
              alt={section.photoAlt}
              sizes="(min-width: 1024px) 50vw, 100vw"
              className="object-cover"
              brokenLabel={brokenImageLabel}
            />
          </MediaFrame>
        ) : null;

        return (
          <div
            key={section.id}
            className="grid gap-(--space-sm) lg:grid-cols-2 lg:items-center"
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
