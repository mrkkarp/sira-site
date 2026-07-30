import type { Field } from "payload";

/**
 * Reusable "value + unit" field pair for structured product dimensions
 * (Prompt 10 §7: "не зберігай усі характеристики одним текстовим полем" —
 * every measurable spec gets its own numeric field plus an explicit unit,
 * never a single free-text blob). All fields here are optional: only
 * sinks currently have confirmed structured specs on the real site
 * (verified live — material/height/diameter/weight/faucet-type/
 * connection/mount) — every other category is free-text-only today, so
 * nothing here is required at the collection level. Values are filled in
 * per-product as real data becomes available, never guessed.
 */
export function dimensionField(
  name: string,
  label: string,
  units: readonly string[],
): Field {
  return {
    name,
    type: "group",
    label,
    fields: [
      { name: "value", type: "number", min: 0, admin: { width: "50%" } },
      {
        name: "unit",
        type: "select",
        defaultValue: units[0],
        options: units.map((unit) => ({ label: unit, value: unit })),
        admin: { width: "50%" },
      },
    ],
  };
}

export const lengthUnits = ["mm", "cm", "m"] as const;
export const weightUnits = ["kg"] as const;
export const weightPerAreaUnits = ["kg/m2"] as const;
export const countUnits = ["pcs"] as const;
export const areaUnits = ["m2"] as const;
