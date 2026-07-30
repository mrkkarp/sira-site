import { z } from "zod";
import { ImportBatchId, ImportWarningId } from "../shared/ids";

/**
 * `ImportWarning` (Prompt 8 §1.3/§17, Phase G) — the domain shape
 * backing the `ImportWarnings` Payload collection (Phase B). One row
 * per conflict/anomaly the importer surfaces during a batch (e.g. "SKU
 * already exists with different category", "price changed by >50%
 * since last import"). Kept as its own entity (not embedded in
 * `ImportBatch`) so staff can filter/resolve warnings across batches
 * without loading a batch document that could otherwise grow
 * unboundedly large.
 */
export const ImportEntityType = z.enum([
  "product",
  "category",
  "colour",
  "material",
  "page",
  "article",
  "project",
  "faqItem",
  "stockist",
  "resource",
  "navigationItem",
]);
export type ImportEntityType = z.infer<typeof ImportEntityType>;

export const ImportWarningSeverity = z.enum(["warning", "error"]);
export type ImportWarningSeverity = z.infer<typeof ImportWarningSeverity>;

export const ImportWarningSchema = z.object({
  id: ImportWarningId,
  importBatchId: ImportBatchId,
  entityType: ImportEntityType,
  legacyId: z.string().min(1),
  severity: ImportWarningSeverity,
  message: z.string().min(1),
  resolved: z.boolean().default(false),
  resolutionNote: z.string().optional(),
});
export type ImportWarning = Readonly<z.infer<typeof ImportWarningSchema>>;
