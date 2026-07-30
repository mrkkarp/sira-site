import type { CollectionConfig } from "payload";
import { allowRoles } from "../access";
import { FULL_ACCESS_ROLES, PRODUCT_EDIT_ROLES } from "../access/roles";

/**
 * `ImportBatches` (Prompt 8 §1.3/§17, Phase B). One row per Horoshop
 * import run (dry-run or live), so a re-import is traceable and
 * auditable rather than a silent overwrite. Written by the importer
 * service (Phase G) via the Local API; `create`/`update`/`delete` are
 * full-access-only here because an import run is a significant,
 * catalog-wide operation, not routine catalog editing.
 */
export const ImportBatches: CollectionConfig = {
  slug: "import-batches",
  admin: {
    group: "Технічне",
    useAsTitle: "id",
    defaultColumns: ["source", "mode", "status", "startedAt", "finishedAt"],
  },
  access: {
    read: allowRoles(PRODUCT_EDIT_ROLES),
    create: allowRoles(FULL_ACCESS_ROLES),
    update: allowRoles(FULL_ACCESS_ROLES),
    delete: allowRoles(FULL_ACCESS_ROLES),
  },
  fields: [
    {
      name: "source",
      type: "select",
      required: true,
      defaultValue: "horoshop",
      options: [{ label: "Horoshop", value: "horoshop" }],
    },
    {
      name: "mode",
      type: "select",
      required: true,
      options: ["dryRun", "live"],
    },
    {
      name: "status",
      type: "select",
      required: true,
      defaultValue: "running",
      options: ["running", "completed", "failed"],
    },
    { name: "startedAt", type: "date", required: true },
    { name: "finishedAt", type: "date" },
    {
      name: "totals",
      type: "group",
      fields: [
        { name: "createdCount", type: "number", defaultValue: 0, min: 0 },
        { name: "updatedCount", type: "number", defaultValue: 0, min: 0 },
        { name: "skippedCount", type: "number", defaultValue: 0, min: 0 },
        { name: "conflictCount", type: "number", defaultValue: 0, min: 0 },
        { name: "failedCount", type: "number", defaultValue: 0, min: 0 },
      ],
    },
    { name: "triggeredBy", type: "relationship", relationTo: "users" },
    { name: "notes", type: "textarea" },
  ],
};
