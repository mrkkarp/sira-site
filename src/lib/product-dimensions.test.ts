import { describe, expect, it } from "vitest";
import {
  getDimensionSpecEntries,
  scaleDimensionEntries,
  withoutDimensionSpecEntries,
} from "@/lib/product-dimensions";

// AVA's real parsed spec block, as it comes off the source export.
const ava = [
  { key: "material", label: "Матеріал", value: "архітектурний бетон" },
  { key: "height", label: "Висота", value: "10 см" },
  { key: "diameter", label: "Діаметр", value: "45 см" },
  { key: "weight", label: "Вага", value: "10 кг" },
];

describe("getDimensionSpecEntries", () => {
  it("picks out only the measured axes", () => {
    expect(getDimensionSpecEntries(ava)).toEqual([
      { key: "height", label: "Висота", value: "10 см" },
      { key: "diameter", label: "Діаметр", value: "45 см" },
    ]);
  });

  it("matches on `key`, not on the localized label", () => {
    // Same regression as the installation filter: label matching would return
    // nothing on /en and /pl and silently drop the whole Розміри section.
    expect(
      getDimensionSpecEntries([
        { key: "height", label: "Height", value: "10 cm" },
        { key: "width", label: "Szerokość", value: "45 cm" },
      ]),
    ).toHaveLength(2);
  });

  it("returns nothing for the many products published without measurements", () => {
    expect(
      getDimensionSpecEntries([
        { key: "material", label: "Матеріал", value: "бетон" },
      ]),
    ).toEqual([]);
  });
});

describe("withoutDimensionSpecEntries", () => {
  it("leaves the remaining specs so no measurement is printed twice", () => {
    expect(withoutDimensionSpecEntries(ava)).toEqual([
      { key: "material", label: "Матеріал", value: "архітектурний бетон" },
      { key: "weight", label: "Вага", value: "10 кг" },
    ]);
  });

  it("keeps keyless legacy entries", () => {
    expect(
      withoutDimensionSpecEntries([
        { label: "Оздоблення", value: "шліфування" },
      ]),
    ).toEqual([{ label: "Оздоблення", value: "шліфування" }]);
  });
});

describe("scaleDimensionEntries", () => {
  it("draws each axis in proportion to the longest one", () => {
    // MONRO's real three axes.
    const scaled = scaleDimensionEntries([
      { key: "height", label: "Висота", value: "85 см" },
      { key: "width", label: "Ширина / діаметр", value: "60 см" },
      { key: "depth", label: "Глибина", value: "40 см" },
    ]);
    expect(scaled.map((axis) => axis.ratio)).toEqual([1, 60 / 85, 40 / 85]);
  });

  it("never shrinks an axis below a label's worth of line", () => {
    const [tiny] = scaleDimensionEntries([
      { key: "height", label: "Висота", value: "1 см" },
      { key: "diameter", label: "Діаметр", value: "100 см" },
    ]);
    expect(tiny.ratio).toBe(0.15);
  });

  it("falls back to equal lengths when the units differ", () => {
    // Scaling 850 мм against 41 см would draw the height twenty times the
    // diameter — a lie told confidently in the brand's own drawing language.
    const scaled = scaleDimensionEntries([
      { key: "height", label: "Висота", value: "850 мм" },
      { key: "diameter", label: "Діаметр", value: "41 см" },
    ]);
    expect(scaled.map((axis) => axis.ratio)).toEqual([1, 1]);
  });

  it("falls back to equal lengths when a value is not a plain measurement", () => {
    const scaled = scaleDimensionEntries([
      { key: "height", label: "Висота", value: "85 см" },
      { key: "width", label: "Ширина", value: "за запитом" },
    ]);
    expect(scaled.map((axis) => axis.ratio)).toEqual([1, 1]);
  });

  it("keeps the entries it was given, in order", () => {
    const entries = getDimensionSpecEntries(ava);
    expect(scaleDimensionEntries(entries).map((axis) => axis.entry)).toEqual(
      entries,
    );
  });
});
