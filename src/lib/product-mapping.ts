import type {
  ShopCategory,
  SinkType,
  PlanterPlacement,
} from "@/lib/schemas/product";

/**
 * Pure (no `server-only`) mapping helpers, split out of `products.ts` so they
 * can be unit-tested directly against sample source rows without touching
 * the filesystem/JSON import.
 */

/**
 * Maps the raw Horoshop `category` string (e.g. "Раковини/Підлогові") onto
 * our shop route taxonomy. Extend this — don't invent new source categories.
 */
export function mapCategory(sourceCategory: string): {
  shopCategory: ShopCategory;
  sinkType?: SinkType;
  planterPlacement?: PlanterPlacement;
} {
  if (sourceCategory.startsWith("Раковини/Підлогові")) {
    return { shopCategory: "sinks", sinkType: "freestanding" };
  }
  if (sourceCategory.startsWith("Раковини/Накладні")) {
    return { shopCategory: "sinks", sinkType: "countertop" };
  }
  if (sourceCategory.startsWith("Раковини")) {
    return { shopCategory: "sinks" };
  }
  if (sourceCategory.startsWith("Вазони/Вуличні")) {
    return { shopCategory: "planters", planterPlacement: "outdoor" };
  }
  if (sourceCategory.startsWith("Вазони")) {
    return { shopCategory: "planters", planterPlacement: "indoor" };
  }
  if (sourceCategory.startsWith("Столики")) {
    return { shopCategory: "tables" };
  }
  if (sourceCategory.startsWith("Вуличні меблі")) {
    return { shopCategory: "outdoor" };
  }
  // "Панелі" (flat wall panels) and "Панно" (wall art/relief pieces) are
  // distinct real source categories — map them to their own routes rather
  // than collapsing both into "wall-art".
  if (sourceCategory.startsWith("Панелі")) {
    return { shopCategory: "wall-panels" };
  }
  if (sourceCategory.startsWith("Панно")) {
    return { shopCategory: "wall-art" };
  }
  // Unmapped source category — falls back to the closest bucket rather than
  // throwing, so a new Horoshop category doesn't break the whole build.
  return { shopCategory: "wall-art" };
}

export function slugify(value: string): string {
  return value
    .replace(/[^a-zA-Z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .toLowerCase();
}

/**
 * Extracts real numeric dimensions from the "Характеристики" block that
 * appears (sinks only, so far) inside `fullDesc`, e.g.:
 *   "Висота: 85 см" / "Ширина / діаметр: 60 см" / "Діаметр: 41 см"
 * This is genuine data already present in the source export — not invented —
 * just embedded in free text rather than a structured field. Deliberately
 * conservative: any description that doesn't match the expected pattern
 * simply yields `undefined` for that dimension rather than guessing.
 */
export function parseDimensionsCm(fullDesc: string): {
  heightCm?: number;
  widthCm?: number;
} {
  const heightMatch = fullDesc.match(/Висота:\s*([\d]+(?:[.,]\d+)?)\s*см/i);
  const widthMatch = fullDesc.match(
    /(?:Ширина(?:\s*\/\s*діаметр)?|Діаметр):\s*([\d]+(?:[.,]\d+)?)\s*см/i,
  );
  return {
    heightCm: heightMatch
      ? Number.parseFloat(heightMatch[1].replace(",", "."))
      : undefined,
    widthCm: widthMatch
      ? Number.parseFloat(widthMatch[1].replace(",", "."))
      : undefined,
  };
}

/**
 * Extracts the real "Характеристики" (specs) block that appears (sinks only,
 * so far) inside `fullDesc`, e.g.:
 *   "Характеристики\n-\nМатеріал: архітектурний бетон\n-\nВисота: 85 см\n-\n..."
 * Each entry is a genuine "Label: value" line from the source export — never
 * invented. Products whose `fullDesc` has no "Характеристики" heading (every
 * category besides sinks, currently) simply yield an empty array.
 */
export function parseSpecEntries(
  fullDesc: string,
): { label: string; value: string }[] {
  const headingIndex = fullDesc.indexOf("Характеристики");
  if (headingIndex === -1) return [];

  const afterHeading = fullDesc.slice(headingIndex + "Характеристики".length);
  const lines = afterHeading.split("\n").map((line) => line.trim());

  const entries: { label: string; value: string }[] = [];
  for (const line of lines) {
    // Bare bullet markers ("-") separate entries but carry no data.
    if (line === "" || line === "-") continue;
    const match = line.match(/^-?\s*([^:]+):\s*(.+)$/);
    if (!match) continue;
    const label = match[1].trim();
    const value = match[2].trim();
    if (label && value) entries.push({ label, value });
  }
  return entries;
}

/**
 * Extracts the real per-product lead time from the "Термін виготовлення - N
 * тижні/тиждень." sentence that appears in some source rows' `shortDesc`/
 * `fullDesc` (sinks only, so far, and only ~25 of 67 rows). Deliberately
 * conservative — returns `undefined` (never a guessed/global default) when
 * the sentence isn't present verbatim, per the requirement that lead time
 * must be a real, variable, per-product field rather than one hardcoded
 * term for every product.
 */
export function parseLeadTimeWeeks(text: string): number | undefined {
  const match = text.match(
    /Термін виготовлення[^-]*-\s*([\d]+)\s*(?:тижні|тиждень|тижнів)/i,
  );
  if (!match) return undefined;
  return Number.parseInt(match[1], 10);
}

/**
 * Extracts the real "may be out of stock" free-text note
 * ("Раковина може бути відсутня на складі.") when the source export states
 * it. Returns `undefined` (not `false`) when the sentence is absent — the
 * absence of this note is not proof of "always in stock," so callers must
 * not treat `undefined` as a negative claim, only as "no signal available."
 */
export function parseMayBeOutOfStock(text: string): boolean | undefined {
  return text.includes("може бути відсутня на складі") ? true : undefined;
}

/**
 * A parsed "N см"/"N кг" measurement, normalised to the unit vocabularies
 * `Products.ts`'s `specFields.ts` declares. Length-ish specs
 * (height/width/depth/diameter) use `specFields.ts`'s `lengthUnits`
 * (`mm`/`cm`/`m` — only `cm` is ever actually produced here, since the
 * source text is always "N см"); weight uses `specFields.ts`'s
 * `weightUnits` (`kg`, the only value it declares).
 */
export interface LengthMeasurement {
  value: number;
  unit: "cm";
}

export interface WeightMeasurement {
  value: number;
  unit: "kg";
}

type ParsedMeasurement =
  { value: number; unit: "cm" } | { value: number; unit: "kg" };

function parseMeasurementValue(raw: string): ParsedMeasurement | undefined {
  const match = raw.match(/^~?\s*([\d]+(?:[.,]\d+)?)\s*(см|кг)$/i);
  if (!match) return undefined;
  const value = Number.parseFloat(match[1].replace(",", "."));
  return match[2].toLowerCase() === "см"
    ? { value, unit: "cm" }
    : { value, unit: "kg" };
}

/** Real "Label: value" -> Payload `specs.*` field keys this app actually has (Prompt 10 §7, verified live: material/height/diameter/weight/faucet-type/mount are the confirmed structured specs). */
const TEXT_SPEC_LABEL_MAP: Record<
  string,
  "material" | "faucetType" | "mountType"
> = {
  Матеріал: "material",
  "Тип змішувача": "faucetType",
  Монтаж: "mountType",
};

const MEASUREMENT_SPEC_LABEL_MAP: Record<
  string,
  "height" | "width" | "depth" | "diameter"
> = {
  Висота: "height",
  Ширина: "width",
  "Ширина / діаметр": "width",
  Глибина: "depth",
  Діаметр: "diameter",
};

export interface MappedPayloadSpecs {
  material?: string;
  faucetType?: string;
  mountType?: string;
  height?: LengthMeasurement;
  width?: LengthMeasurement;
  depth?: LengthMeasurement;
  diameter?: LengthMeasurement;
  weight?: WeightMeasurement;
}

/**
 * Maps `parseSpecEntries()`'s real "Label: value" pairs onto the subset of
 * `Products.ts`'s typed `specs` fields this data can honestly fill
 * (Phase G, the Horoshop importer). Two real labels are deliberately left
 * unmapped rather than guessed:
 *  - "Колір" (colour) — already represented via the variant's own colour
 *    row/label, not a `specs` field.
 *  - "Підключення" (connection) — the source gives one combined free-text
 *    description (e.g. "можливе зі стіни або з підлоги", "приховане
 *    підлогове") that doesn't reliably split into the schema's separate
 *    `wallConnection`/`floorConnection` fields; forcing it into one would
 *    misrepresent which connection type the text actually describes.
 */
export function mapSpecEntriesToPayloadSpecs(
  entries: { label: string; value: string }[],
): MappedPayloadSpecs {
  const out: MappedPayloadSpecs = {};
  for (const { label, value } of entries) {
    if (label === "Вага") {
      const measurement = parseMeasurementValue(value);
      if (measurement && measurement.unit === "kg") out.weight = measurement;
      continue;
    }
    const textKey = TEXT_SPEC_LABEL_MAP[label];
    if (textKey) {
      out[textKey] = value;
      continue;
    }
    const measurementKey = MEASUREMENT_SPEC_LABEL_MAP[label];
    if (measurementKey) {
      const measurement = parseMeasurementValue(value);
      if (measurement && measurement.unit === "cm")
        out[measurementKey] = measurement;
    }
  }
  return out;
}

/**
 * Real, if approximate, Ukrainian pluralisation for a lead-time week count
 * (matches the pattern already seen verbatim in the source's own
 * "Термін виготовлення - N тижні." sentences) — used to reconstruct a
 * `variants[].leadTimeOverride` string from `parseLeadTimeWeeks()`'s parsed
 * number without inventing a count that isn't in the source.
 */
export function formatLeadTimeWeeksUk(weeks: number): string {
  const mod100 = weeks % 100;
  const mod10 = weeks % 10;
  let word: string;
  if (mod100 >= 11 && mod100 <= 14) {
    word = "тижнів";
  } else if (mod10 === 1) {
    word = "тиждень";
  } else if (mod10 >= 2 && mod10 <= 4) {
    word = "тижні";
  } else {
    word = "тижнів";
  }
  return `Термін виготовлення - ${weeks} ${word}.`;
}
