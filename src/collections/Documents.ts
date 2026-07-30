import type { CollectionConfig } from "payload";
import { allowRoles, allowRolesField } from "../access";
import { FULL_ACCESS_ROLES, PRODUCT_EDIT_ROLES } from "../access/roles";

/**
 * Product documents (Prompt 10 §7 "product documents" / §18 designer
 * resources overlap). Deliberately a separate upload collection from
 * `Media` — these are technical files (PDF/DWG/DXF/SKP/OBJ/STL/BIM),
 * not photography, and carry different metadata (language, version,
 * visibility, designer-only access) that doesn't belong on a photo.
 *
 * `visibility: private` documents are read-restricted at the API level
 * (not just hidden in a UI list) — a Viewer/Translator/Sales Manager
 * should not be able to fetch a private spec file by guessing its ID.
 */
export const Documents: CollectionConfig = {
  slug: "documents",
  admin: {
    group: "Каталог",
    useAsTitle: "name",
    defaultColumns: ["name", "format", "visibility", "linkedProduct"],
  },
  access: {
    read: ({ req }) => {
      // Public/designer-only visibility is enforced by the (future)
      // storefront/designer-portal read path, which will query with
      // overrideAccess or its own scoped API — the admin API itself
      // always requires an authenticated admin user with catalog access,
      // and further restricts `private` docs to full-access roles.
      if (!req.user) return false;
      const role = (req.user as unknown as { role?: string }).role;
      if (role && (FULL_ACCESS_ROLES as readonly string[]).includes(role))
        return true;
      return { visibility: { not_equals: "private" } };
    },
    create: allowRoles(PRODUCT_EDIT_ROLES),
    update: allowRoles(PRODUCT_EDIT_ROLES),
    delete: allowRoles(PRODUCT_EDIT_ROLES),
  },
  upload: {
    staticDir: "../documents",
    mimeTypes: [
      "application/pdf",
      "image/vnd.dwg",
      "application/dxf",
      "application/octet-stream", // SKP/OBJ/STL/BIM and other CAD formats without a registered MIME type
    ],
  },
  fields: [
    {
      name: "name",
      type: "text",
      required: true,
    },
    {
      name: "format",
      type: "select",
      required: true,
      options: [
        "pdf",
        "dwg",
        "dxf",
        "skp",
        "obj",
        "stl",
        "bim",
        "installInstructions",
        "careInstructions",
        "warranty",
        "spec",
        "dimensionalDrawing",
      ].map((value) => ({ label: value, value })),
    },
    {
      name: "language",
      type: "select",
      options: [
        { label: "Українська", value: "uk" },
        { label: "English", value: "en" },
        { label: "Polski", value: "pl" },
      ],
    },
    {
      name: "version",
      type: "text",
    },
    {
      name: "documentDate",
      type: "date",
    },
    {
      name: "visibility",
      type: "select",
      required: true,
      defaultValue: "public",
      options: [
        { label: "Публічний", value: "public" },
        { label: "Приватний (лише адмін)", value: "private" },
        { label: "Лише для дизайнерів", value: "designerOnly" },
      ],
      access: {
        update: allowRolesField(PRODUCT_EDIT_ROLES),
      },
    },
    {
      name: "linkedProduct",
      type: "relationship",
      relationTo: "products",
    },
    {
      name: "linkedVariantSku",
      type: "text",
      admin: {
        description:
          "SKU варіанта, якщо документ стосується конкретного варіанта, а не всього товару.",
      },
    },
  ],
};
