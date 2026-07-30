import type { Dictionary } from "@/i18n/get-dictionary";
import type { DescriptionSection } from "@/lib/product-description";

const headingKeyById = {
  intro: "descriptionIntroHeading",
} as const satisfies Record<
  DescriptionSection["id"],
  keyof Dictionary["product"]
>;

/**
 * Renders the structured description sections built by
 * `buildDescriptionSections` — Prompt 6 §8. Only "intro" exists today (see
 * that module's doc comment for why the idea/material/usage/features/care
 * split isn't real data); this component still maps over `sections` rather
 * than hardcoding "intro" so a future real section slots in without a
 * rewrite here.
 */
export function ProductDescription({
  sections,
  dictionary,
}: {
  sections: DescriptionSection[];
  dictionary: Dictionary;
}) {
  if (sections.length === 0) return null;

  return (
    <div className="flex flex-col gap-(--space-sm)">
      {sections.map((section) => (
        <div key={section.id} className="flex flex-col gap-(--space-3xs)">
          <h2 className="type-h4 text-text">
            {dictionary.product[headingKeyById[section.id]]}
          </h2>
          <p className="type-body text-text-muted whitespace-pre-line">
            {section.text}
          </p>
        </div>
      ))}
    </div>
  );
}
