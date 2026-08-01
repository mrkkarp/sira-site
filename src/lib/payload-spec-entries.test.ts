import { describe, expect, it } from "vitest";
import { buildSpecEntriesFromPayload } from "@/lib/payload-spec-entries";
import { getDictionary } from "@/i18n/get-dictionary";
import type { Product as PayloadProduct } from "@/payload-types";

type Specs = PayloadProduct["specs"];

describe("buildSpecEntriesFromPayload", () => {
  it("builds rows from the typed specs group, in a fixed reading order", async () => {
    const dictionary = await getDictionary("uk");
    const specs = {
      material: "архітектурний бетон",
      height: { value: 85, unit: "cm" },
      diameter: { value: 41, unit: "cm" },
      weight: { value: 100, unit: "kg" },
      faucetType: "зі стіни, окремо стоячий",
      connection: "можливе зі стіни або з підлоги",
    } as unknown as Specs;

    expect(buildSpecEntriesFromPayload(specs, dictionary, "uk")).toEqual([
      { key: "material", label: "Матеріал", value: "архітектурний бетон" },
      { key: "height", label: "Висота", value: "85 см" },
      { key: "diameter", label: "Діаметр", value: "41 см" },
      { key: "weight", label: "Вага", value: "100 кг" },
      {
        key: "faucetType",
        label: "Тип змішувача",
        value: "зі стіни, окремо стоячий",
      },
      {
        key: "connection",
        label: "Підключення",
        value: "можливе зі стіни або з підлоги",
      },
    ]);
  });

  it("renders labels and unit suffixes in the requested locale", async () => {
    // The whole point of the migration off the legacy snapshot: the source
    // block was one frozen Ukrainian string, so /en showed Ukrainian.
    const specs = {
      material: "architectural concrete",
      height: { value: 85, unit: "cm" },
      weight: { value: 100, unit: "kg" },
    } as unknown as Specs;

    const en = buildSpecEntriesFromPayload(
      specs,
      await getDictionary("en"),
      "en",
    );
    expect(en).toEqual([
      { key: "material", label: "Material", value: "architectural concrete" },
      { key: "height", label: "Height", value: "85 cm" },
      { key: "weight", label: "Weight", value: "100 kg" },
    ]);

    const pl = buildSpecEntriesFromPayload(
      { height: { value: 85, unit: "cm" } } as unknown as Specs,
      await getDictionary("pl"),
      "pl",
    );
    expect(pl).toEqual([
      { key: "height", label: "Wysokość", value: "85 cm" },
    ]);
  });

  it("omits absent, blank and value-less specs instead of rendering empty rows", async () => {
    const dictionary = await getDictionary("uk");
    const specs = {
      material: "  ",
      // A dimension group can exist with a unit default but no real value —
      // that is "not measured yet", not "0 cm".
      height: { value: null, unit: "cm" },
      diameter: { value: 41, unit: "cm" },
    } as unknown as Specs;

    expect(buildSpecEntriesFromPayload(specs, dictionary, "uk")).toEqual([
      { key: "diameter", label: "Діаметр", value: "41 см" },
    ]);
  });

  it("returns an empty array when the product has no specs at all", async () => {
    const dictionary = await getDictionary("uk");
    expect(buildSpecEntriesFromPayload(null, dictionary, "uk")).toEqual([]);
    expect(
      buildSpecEntriesFromPayload({} as unknown as Specs, dictionary, "uk"),
    ).toEqual([]);
  });
});
