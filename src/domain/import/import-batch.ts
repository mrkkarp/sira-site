import { z } from "zod";
import { ImportBatchId } from "../shared/ids";

/**
 * `ImportBatch` (Prompt 8 §1.3/§17, Phase G) — the domain shape backing
 * the `ImportBatches` Payload collection (Phase B). One row per
 * Horoshop import run; `mode` distinguishes a dry-run (no writes to
 * `Products`/`Categories`/`Media`/`Redirects`, only a preview of what
 * would happen) from a live run. `totals` is intentionally flat
 * counters rather than embedded per-entity arrays — see
 * `ImportWarning` for why per-item detail lives in its own collection
 * instead.
 */
export const ImportMode = z.enum(["dryRun", "live"]);
export type ImportMode = z.infer<typeof ImportMode>;

export const ImportBatchStatus = z.enum(["running", "completed", "failed"]);
export type ImportBatchStatus = z.infer<typeof ImportBatchStatus>;

export const ImportBatchTotalsSchema = z.object({
  createdCount: z.number().int().min(0).default(0),
  updatedCount: z.number().int().min(0).default(0),
  skippedCount: z.number().int().min(0).default(0),
  conflictCount: z.number().int().min(0).default(0),
  failedCount: z.number().int().min(0).default(0),
});
export type ImportBatchTotals = Readonly<
  z.infer<typeof ImportBatchTotalsSchema>
>;

export const ImportBatchSchema = z.object({
  id: ImportBatchId,
  source: z.literal("horoshop"),
  mode: ImportMode,
  status: ImportBatchStatus,
  startedAt: z.string().datetime(),
  finishedAt: z.string().datetime().optional(),
  totals: ImportBatchTotalsSchema,
  triggeredBy: z.string().min(1).optional(),
  notes: z.string().optional(),
});
export type ImportBatch = Readonly<z.infer<typeof ImportBatchSchema>>;
