import { describe, expect, it } from "vitest";
import { buildDescriptionSections } from "@/lib/product-description";

describe("buildDescriptionSections", () => {
  it("extracts the real intro paragraph that precedes the Характеристики heading", () => {
    const fullDesc =
      "Odri - підлогова бетонна раковина.\nХарактеристики\n-\nМатеріал: архітектурний бетон";
    expect(buildDescriptionSections(fullDesc)).toEqual([
      { id: "intro", text: "Odri - підлогова бетонна раковина." },
    ]);
  });

  it("uses the whole text as intro when there is no Характеристики heading", () => {
    expect(buildDescriptionSections("Просто опис без характеристик.")).toEqual([
      { id: "intro", text: "Просто опис без характеристик." },
    ]);
  });

  it("returns no sections for empty/blank text rather than an empty intro", () => {
    expect(buildDescriptionSections("")).toEqual([]);
    expect(buildDescriptionSections("   ")).toEqual([]);
  });
});
