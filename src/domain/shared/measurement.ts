import { z } from "zod";

/**
 * `Dimensions` (Prompt 8 §2.1) — mirrors the value+unit pairing already
 * established in `src/collections/fields/specFields.ts` (every
 * measurable spec gets its own numeric value *and* an explicit unit,
 * never a bare number with an assumed unit). Defined independently
 * here rather than imported from the Payload collection file, since
 * `specFields.ts` returns Payload `Field` configs (admin-UI concerns),
 * not domain data — this is the runtime-validated shape a repository
 * returns to the rest of the app.
 */
export const LengthUnit = z.enum(["mm", "cm", "m"]);
export type LengthUnit = z.infer<typeof LengthUnit>;

export const WeightUnit = z.enum(["kg"]);
export type WeightUnit = z.infer<typeof WeightUnit>;

export const AreaUnit = z.enum(["m2"]);
export type AreaUnit = z.infer<typeof AreaUnit>;

export const CountUnit = z.enum(["pcs"]);
export type CountUnit = z.infer<typeof CountUnit>;

function measurementSchema<UnitSchema extends z.ZodTypeAny>(unit: UnitSchema) {
  return z.object({
    value: z.number().nonnegative(),
    unit,
  });
}

export const LengthMeasurementSchema = measurementSchema(LengthUnit);
export type LengthMeasurement = Readonly<
  z.infer<typeof LengthMeasurementSchema>
>;

export const WeightMeasurementSchema = measurementSchema(WeightUnit);
export type WeightMeasurement = Readonly<
  z.infer<typeof WeightMeasurementSchema>
>;

/**
 * All optional: verified live on odudlab.com that only sinks currently
 * carry real structured dimensions (height/diameter/weight) — every
 * other category is free-text-only today, so nothing here is required
 * at the domain-model level either.
 */
export const DimensionsSchema = z.object({
  width: LengthMeasurementSchema.optional(),
  depth: LengthMeasurementSchema.optional(),
  height: LengthMeasurementSchema.optional(),
  diameter: LengthMeasurementSchema.optional(),
  thickness: LengthMeasurementSchema.optional(),
  weight: WeightMeasurementSchema.optional(),
});
export type Dimensions = Readonly<z.infer<typeof DimensionsSchema>>;
