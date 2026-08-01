import type { Product as PayloadProduct } from "@/payload-types";
import type { ProductSpecEntry } from "@/lib/schemas/product";
import type { Dictionary } from "@/i18n/get-dictionary";

/**
 * Builds the product page's "Характеристики" rows out of Payload's typed
 * `specs` group.
 *
 * This exists so the admin is the single source of truth. Before it, the
 * storefront read `specEntries` straight out of the retained Horoshop JSON
 * snapshot (`products.source.json`), re-parsed from the free-text
 * "Характеристики" block inside `fullDesc`. That had three consequences the
 * owner hit directly:
 *  - editing the specs group in the admin changed nothing on the site;
 *  - the specs group looked empty in the admin while the site showed rows;
 *  - the rows were one fixed Ukrainian string, so `/en` and `/pl` displayed
 *    Ukrainian regardless of locale.
 *
 * Only fields that actually hold a value are emitted — an absent spec is
 * omitted rather than rendered blank or filled with a guess. Ordering is
 * fixed here (identity → dimensions → installation → service) rather than
 * following the JSON key order, so every product's table reads the same way.
 */

/** Localized unit suffixes. The unit vocabularies come from
 * `specFields.ts` (`lengthUnits`, `weightUnits`, `weightPerAreaUnits`,
 * `areaUnits`, `countUnits`); they are stored as stable codes (`cm`, `kg`,
 * `m2`, `pcs`) precisely so they can be rendered per language instead of
 * being frozen as Ukrainian text the way the legacy source block was. */
const UNIT_LABELS: Record<string, Record<string, string>> = {
  uk: { mm: "мм", cm: "см", m: "м", kg: "кг", "kg/m2": "кг/м²", m2: "м²", pcs: "шт." },
  en: { mm: "mm", cm: "cm", m: "m", kg: "kg", "kg/m2": "kg/m²", m2: "m²", pcs: "pcs" },
  pl: { mm: "mm", cm: "cm", m: "m", kg: "kg", "kg/m2": "kg/m²", m2: "m²", pcs: "szt." },
};

type Specs = NonNullable<PayloadProduct["specs"]>;

/** Text specs, in display order. Keys match `Products.ts`'s `specs` fields
 * and `dictionary.product.specLabels`. */
const TEXT_SPEC_KEYS = [
  "material",
  "technology",
  "reinforcement",
  "coating",
  "mountType",
  "faucetType",
  "faucetHole",
  "overflow",
  "connection",
  "wallConnection",
  "floorConnection",
  "drainage",
  "fixingMethod",
  "packagingType",
  "warranty",
  "care",
  "countryOfOrigin",
] as const satisfies readonly (keyof Specs)[];

/** Measurement specs (`{ value, unit }` groups from `dimensionField`), in
 * display order — inserted between material-ish and installation-ish text
 * specs by the assembly order below. */
const MEASUREMENT_SPEC_KEYS = [
  "width",
  "depth",
  "height",
  "diameter",
  "thickness",
  "weight",
  "weightPerArea",
  "drainDiameter",
  "coverageArea",
  "piecesPerPack",
] as const satisfies readonly (keyof Specs)[];

function formatMeasurement(
  measurement: { value?: number | null; unit?: string | null } | null | undefined,
  locale: string,
): string | undefined {
  if (!measurement || measurement.value == null) return undefined;
  const unit = measurement.unit
    ? (UNIT_LABELS[locale]?.[measurement.unit] ?? measurement.unit)
    : undefined;
  return unit ? `${measurement.value} ${unit}` : String(measurement.value);
}

export function buildSpecEntriesFromPayload(
  // `null` is included deliberately: the generated type says the group is
  // always present, but a product row written before the group existed reads
  // back as null, and the guard below is what keeps that off the product page.
  specs: PayloadProduct["specs"] | null,
  dictionary: Dictionary,
  locale: string,
): ProductSpecEntry[] {
  if (!specs) return [];
  const labels = dictionary.product.specLabels as Record<string, string>;
  const entries: ProductSpecEntry[] = [];

  const pushText = (key: string) => {
    const raw = (specs as Record<string, unknown>)[key];
    if (typeof raw !== "string") return;
    const value = raw.trim();
    if (!value) return;
    const label = labels[key];
    // No dictionary label means the field was added to the collection but
    // not to the dictionaries — skip rather than print a raw camelCase key
    // at customers.
    if (!label) return;
    entries.push({ key, label, value });
  };

  const pushMeasurement = (key: string) => {
    const value = formatMeasurement(
      (specs as Record<string, { value?: number | null; unit?: string | null } | null>)[key],
      locale,
    );
    if (!value) return;
    const label = labels[key];
    if (!label) return;
    entries.push({ key, label, value });
  };

  // Identity first (what it is made of), then physical dimensions, then the
  // installation/service specs — the order a customer reads them in.
  for (const key of ["material", "technology", "reinforcement", "coating"]) {
    pushText(key);
  }
  for (const key of MEASUREMENT_SPEC_KEYS) pushMeasurement(key);
  for (const key of TEXT_SPEC_KEYS) {
    if (["material", "technology", "reinforcement", "coating"].includes(key)) {
      continue;
    }
    pushText(key);
  }

  return entries;
}
