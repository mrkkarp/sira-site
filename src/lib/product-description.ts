export interface DescriptionSection {
  /** Only "intro" exists today — see the comment below. Kept as a union (not
   * a bare string) so a future real "idea"/"material"/"usage"/"features"/
   * "care" section can be added without changing consumers' shape. */
  id: "intro";
  text: string;
}

/**
 * Splits a product's real `fullDesc` into structured sections per Prompt 6
 * §8 ("intro; design idea; material; usage; features; care — not one
 * unbroken block").
 *
 * The real source export (`products.source.json`) never actually separates
 * those concerns: every `fullDesc` is one free-text paragraph (covering
 * shape/idea/material/use all at once) followed by a "Характеристики"
 * heading and a flat label/value spec list (see `parseSpecEntries`). There
 * is no distinct "material", "usage", "features", or "care" prose anywhere
 * in the export — searching all 67 rows for those headings turns up
 * nothing. So this deliberately returns just the one real "intro" section
 * (the paragraph before "Характеристики") rather than fabricating splits
 * that don't exist in the source. This is a documented "needs real ODUDLAB
 * data" gap, not an oversight — see the final Prompt 6 report.
 */
export function buildDescriptionSections(
  fullDesc: string,
): DescriptionSection[] {
  const headingIndex = fullDesc.indexOf("Характеристики");
  const introRaw =
    headingIndex === -1 ? fullDesc : fullDesc.slice(0, headingIndex);
  const text = introRaw.trim();
  return text ? [{ id: "intro", text }] : [];
}
