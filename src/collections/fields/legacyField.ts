import type { Field } from "payload";

/**
 * Reusable `legacy` group (Prompt 8 §1.3, Phase G) — mirrors
 * `src/domain/shared/legacy.ts`'s `LegacyMetadataSchema` exactly, so the
 * repository mapper can read this straight back into that shape. Shared
 * between `Products` and `Categories` (the two collections the Horoshop
 * importer actually populates — `Colours` isn't imported: the source
 * export has no real distinct colour data, just a generic "custom
 * colour on request" signal, so there's nothing honest to import there).
 *
 * `enumName` is passed in per collection to avoid two collections
 * generating colliding Postgres enum type names for the same field
 * path pattern (same reason `Products.ts`'s `productionCapacityStatus`
 * field overrides its own auto-generated name).
 */
export function legacyField(enumPrefix: string): Field {
  return {
    name: "legacy",
    type: "group",
    label: "Дані імпорту",
    admin: {
      position: "sidebar",
      description:
        "Заповнюється автоматично імпортером Horoshop. Не редагувати вручну.",
      readOnly: true,
    },
    fields: [
      {
        name: "legacySource",
        type: "select",
        defaultValue: "horoshop",
        enumName: `${enumPrefix}_legacy_source`,
        options: [{ label: "Horoshop", value: "horoshop" }],
      },
      { name: "legacyId", type: "text" },
      { name: "legacyUrl", type: "text" },
      { name: "legacySlug", type: "text" },
      { name: "importedAt", type: "date" },
      {
        name: "importBatchId",
        type: "relationship",
        relationTo: "import-batches",
      },
      {
        name: "migrationStatus",
        type: "select",
        enumName: `${enumPrefix}_migration_status`,
        options: [
          "pending",
          "imported",
          "updated",
          "skipped",
          "conflict",
          "failed",
        ],
      },
      {
        name: "migrationWarnings",
        type: "array",
        fields: [{ name: "warning", type: "text", required: true }],
      },
      { name: "sourceChecksum", type: "text" },
    ],
  };
}
