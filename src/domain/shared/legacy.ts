import { z } from "zod";
import { ImportBatchId } from "./ids";

/**
 * `LegacyMetadata` (Prompt 8 §1.3) — attached to every imported record
 * (product, category, colour, ...) so a re-import can tell "already
 * imported, needs update" from "new" from "hand-edited since import,
 * don't clobber". `legacySource` is a literal union of one value today
 * (`"horoshop"`) — deliberately not a bare string, so a second future
 * import source is a type-checked addition, not a typo-prone string.
 */
export const MigrationStatus = z.enum([
  "pending",
  "imported",
  "updated",
  "skipped",
  "conflict",
  "failed",
]);
export type MigrationStatus = z.infer<typeof MigrationStatus>;

export const LegacyMetadataSchema = z.object({
  legacySource: z.literal("horoshop"),
  legacyId: z.string().min(1),
  legacyUrl: z.string().min(1).optional(),
  legacySlug: z.string().min(1).optional(),
  importedAt: z.string().datetime(),
  importBatchId: ImportBatchId,
  migrationStatus: MigrationStatus,
  migrationWarnings: z.array(z.string()).default([]),
  /** Checksum of the source record at import time — lets a re-import detect "source didn't change, skip" vs. "source changed, needs re-mapping" without re-diffing every field. */
  sourceChecksum: z.string().min(1),
});
export type LegacyMetadata = Readonly<z.infer<typeof LegacyMetadataSchema>>;
