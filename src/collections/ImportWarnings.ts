import type { CollectionConfig } from "payload";
import { allowRoles } from "../access";
import { FULL_ACCESS_ROLES, PRODUCT_EDIT_ROLES } from "../access/roles";

/**
 * `ImportWarnings` (Prompt 8 §1.3/§17, Phase B). One row per
 * conflict/anomaly the Horoshop importer (Phase G) surfaces during a
 * batch — e.g. "SKU already exists with different category", "price
 * changed by >50% since last import". Kept separate from
 * `ImportBatches` (rather than an embedded array there) so staff can
 * filter/resolve warnings across batches and so a batch with thousands
 * of warnings doesn't bloat a single document.
 */
export const ImportWarnings: CollectionConfig = {
  slug: "import-warnings",
  admin: {
    group: "Технічне",
    useAsTitle: "message",
    defaultColumns: ["importBatch", "entityType", "severity", "resolved"],
  },
  access: {
    read: allowRoles(PRODUCT_EDIT_ROLES),
    create: allowRoles(FULL_ACCESS_ROLES),
    update: allowRoles(PRODUCT_EDIT_ROLES),
    delete: allowRoles(FULL_ACCESS_ROLES),
  },
  fields: [
    {
      name: "importBatch",
      type: "relationship",
      relationTo: "import-batches",
      required: true,
    },
    {
      name: "entityType",
      type: "select",
      required: true,
      options: [
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
      ],
    },
    { name: "legacyId", type: "text", required: true },
    {
      name: "severity",
      type: "select",
      required: true,
      defaultValue: "warning",
      options: ["warning", "error"],
    },
    { name: "message", type: "textarea", required: true },
    { name: "resolved", type: "checkbox", defaultValue: false },
    { name: "resolutionNote", type: "text" },
  ],
};
