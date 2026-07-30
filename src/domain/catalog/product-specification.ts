import { z } from "zod";
import { LocaleContentSchema } from "../shared/locale-content";

/**
 * `ProductSpecification` (Prompt 8 §2.1) — a discriminated union
 * because the real catalog genuinely has two kinds of characteristic
 * today (verified live on odudlab.com): free-text ("Матеріал: бетон")
 * for every category, and a numeric measurement with a unit
 * ("Висота: 90 см") confirmed so far only for sinks. Modeling both as
 * one shape would force either a fake unit on text specs or a
 * stringly-typed number on measurement specs — the union keeps each
 * variant exact. This is the domain-layer equivalent of the existing
 * `ProductSpecEntry` (`label, value`) in `src/lib/schemas/product.ts`,
 * extended with the `measurement` kind that entry never needed because
 * the storefront hasn't consumed structured specs yet.
 */
export const ProductSpecificationSchema = z.discriminatedUnion("kind", [
  z.object({
    kind: z.literal("text"),
    key: z.string().min(1),
    label: LocaleContentSchema,
    value: LocaleContentSchema,
  }),
  z.object({
    kind: z.literal("measurement"),
    key: z.string().min(1),
    label: LocaleContentSchema,
    value: z.number(),
    unit: z.string().min(1),
  }),
]);
export type ProductSpecification = Readonly<
  z.infer<typeof ProductSpecificationSchema>
>;
