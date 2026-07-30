import { describe, expect, it } from "vitest";
import {
  mapCategory,
  slugify,
  parseDimensionsCm,
  parseSpecEntries,
  parseLeadTimeWeeks,
  parseMayBeOutOfStock,
  mapSpecEntriesToPayloadSpecs,
  formatLeadTimeWeeksUk,
} from "@/lib/product-mapping";

describe("mapCategory", () => {
  it("splits sinks into freestanding vs countertop", () => {
    expect(mapCategory("Раковини/Підлогові")).toEqual({
      shopCategory: "sinks",
      sinkType: "freestanding",
    });
    expect(mapCategory("Раковини/Накладні")).toEqual({
      shopCategory: "sinks",
      sinkType: "countertop",
    });
  });

  it("splits planters into indoor vs outdoor placement", () => {
    expect(mapCategory("Вазони/До дому")).toEqual({
      shopCategory: "planters",
      planterPlacement: "indoor",
    });
    expect(mapCategory("Вазони/Вуличні")).toEqual({
      shopCategory: "planters",
      planterPlacement: "outdoor",
    });
  });

  it("keeps flat wall panels and wall art/panno as separate categories", () => {
    expect(mapCategory("Панелі")).toEqual({ shopCategory: "wall-panels" });
    expect(mapCategory("Панно на стіну")).toEqual({ shopCategory: "wall-art" });
  });

  it("maps tables and outdoor furniture", () => {
    expect(mapCategory("Столики/Журнальні")).toEqual({
      shopCategory: "tables",
    });
    expect(mapCategory("Вуличні меблі")).toEqual({ shopCategory: "outdoor" });
  });

  it("falls back rather than throwing on an unrecognised source category", () => {
    expect(() => mapCategory("Щось нове")).not.toThrow();
  });
});

describe("slugify", () => {
  it("lowercases and hyphenates plain ASCII input (the shape real `alias` values already have)", () => {
    expect(slugify("ODRI-nakladna")).toBe("odri-nakladna");
    expect(slugify("A -- B")).toBe("a-b");
  });

  it("always produces a URL-safe, hyphen-trimmed result even for non-Latin input", () => {
    expect(slugify("Вазон з бетону «Циліндр 33»")).toMatch(/^[a-z0-9-]*$/);
    expect(slugify("--leading-and-trailing--")).toBe("leading-and-trailing");
  });
});

describe("parseDimensionsCm", () => {
  it("parses height and a plain diameter label", () => {
    const desc =
      "Характеристики\n-\nВисота: 85 см\n-\nДіаметр: 41 см\n-\nВага: ~100 кг";
    expect(parseDimensionsCm(desc)).toEqual({ heightCm: 85, widthCm: 41 });
  });

  it("parses the combined 'Ширина / діаметр' label", () => {
    const desc = "Характеристики\n-\nВисота: 85 см\n-\nШирина / діаметр: 60 см";
    expect(parseDimensionsCm(desc)).toEqual({ heightCm: 85, widthCm: 60 });
  });

  it("prefers a plain 'Ширина' label when both width and depth are listed", () => {
    const desc =
      "Характеристики\n-\nВисота: 85 см\n-\nШирина: 45 см\n-\nГлибина: 45 см";
    expect(parseDimensionsCm(desc).widthCm).toBe(45);
  });

  it("returns undefined fields rather than guessing when the block is absent", () => {
    expect(parseDimensionsCm("Просто опис без характеристик.")).toEqual({
      heightCm: undefined,
      widthCm: undefined,
    });
  });
});

describe("parseSpecEntries", () => {
  it("parses each real 'Label: value' line, skipping bare bullet markers", () => {
    const desc =
      "Odri - раковина.\nХарактеристики\n-\nМатеріал: архітектурний бетон\n-\nВисота: 85 см\n-\nВага: ~100 кг";
    expect(parseSpecEntries(desc)).toEqual([
      { label: "Матеріал", value: "архітектурний бетон" },
      { label: "Висота", value: "85 см" },
      { label: "Вага", value: "~100 кг" },
    ]);
  });

  it("returns an empty array (never invented entries) when there's no 'Характеристики' heading", () => {
    expect(parseSpecEntries("Просто опис без характеристик.")).toEqual([]);
  });
});

describe("parseLeadTimeWeeks", () => {
  it("parses the real '- N тижні.' sentence", () => {
    expect(parseLeadTimeWeeks("Термін виготовлення - 2 тижні.")).toBe(2);
  });

  it("parses the custom-colour variant of the sentence", () => {
    expect(
      parseLeadTimeWeeks(
        "Термін виготовлення за індивідуальним кольором - 2 тижні.",
      ),
    ).toBe(2);
  });

  it("returns undefined (never a guessed global default) when the sentence is absent", () => {
    expect(
      parseLeadTimeWeeks("Опис без терміну виготовлення."),
    ).toBeUndefined();
  });
});

describe("parseMayBeOutOfStock", () => {
  it("returns true when the real out-of-stock note is present", () => {
    expect(parseMayBeOutOfStock("Раковина може бути відсутня на складі.")).toBe(
      true,
    );
  });

  it("returns undefined (not false) when the source is silent — silence isn't proof of in-stock", () => {
    expect(parseMayBeOutOfStock("Звичайний опис.")).toBeUndefined();
  });
});

describe("mapSpecEntriesToPayloadSpecs", () => {
  it("maps real text labels onto their typed specs fields", () => {
    const entries = [
      { label: "Матеріал", value: "архітектурний бетон" },
      { label: "Тип змішувача", value: "прихований" },
      { label: "Монтаж", value: "підлоговий" },
    ];
    expect(mapSpecEntriesToPayloadSpecs(entries)).toEqual({
      material: "архітектурний бетон",
      faucetType: "прихований",
      mountType: "підлоговий",
    });
  });

  it("maps measurement labels (height/width/depth/diameter) to {value, unit: 'cm'}", () => {
    const entries = [
      { label: "Висота", value: "85 см" },
      { label: "Ширина / діаметр", value: "60 см" },
      { label: "Глибина", value: "45 см" },
      { label: "Діаметр", value: "41 см" },
    ];
    expect(mapSpecEntriesToPayloadSpecs(entries)).toEqual({
      height: { value: 85, unit: "cm" },
      width: { value: 60, unit: "cm" },
      depth: { value: 45, unit: "cm" },
      diameter: { value: 41, unit: "cm" },
    });
  });

  it("maps 'Вага' (including a leading '~') to {value, unit: 'kg'}", () => {
    expect(
      mapSpecEntriesToPayloadSpecs([{ label: "Вага", value: "~100 кг" }]),
    ).toEqual({
      weight: { value: 100, unit: "kg" },
    });
  });

  it("silently skips deliberately-unmapped labels ('Колір', 'Підключення') rather than guessing", () => {
    const entries = [
      { label: "Колір", value: "Сірий базовий" },
      { label: "Підключення", value: "можливе зі стіни або з підлоги" },
    ];
    expect(mapSpecEntriesToPayloadSpecs(entries)).toEqual({});
  });

  it("returns an empty object for an empty entry list", () => {
    expect(mapSpecEntriesToPayloadSpecs([])).toEqual({});
  });
});

describe("formatLeadTimeWeeksUk", () => {
  it("uses 'тиждень' for 1 (and any count ending in 1, except 11)", () => {
    expect(formatLeadTimeWeeksUk(1)).toBe("Термін виготовлення - 1 тиждень.");
    expect(formatLeadTimeWeeksUk(21)).toBe("Термін виготовлення - 21 тиждень.");
  });

  it("uses 'тижні' for 2-4 (and any count ending in 2-4, except 12-14)", () => {
    expect(formatLeadTimeWeeksUk(2)).toBe("Термін виготовлення - 2 тижні.");
    expect(formatLeadTimeWeeksUk(3)).toBe("Термін виготовлення - 3 тижні.");
    expect(formatLeadTimeWeeksUk(4)).toBe("Термін виготовлення - 4 тижні.");
    expect(formatLeadTimeWeeksUk(24)).toBe("Термін виготовлення - 24 тижні.");
  });

  it("uses 'тижнів' for 5-20 (the 11-14 exception band) and other counts ending 0/5-9", () => {
    expect(formatLeadTimeWeeksUk(5)).toBe("Термін виготовлення - 5 тижнів.");
    expect(formatLeadTimeWeeksUk(11)).toBe("Термін виготовлення - 11 тижнів.");
    expect(formatLeadTimeWeeksUk(12)).toBe("Термін виготовлення - 12 тижнів.");
    expect(formatLeadTimeWeeksUk(14)).toBe("Термін виготовлення - 14 тижнів.");
    expect(formatLeadTimeWeeksUk(20)).toBe("Термін виготовлення - 20 тижнів.");
  });
});
