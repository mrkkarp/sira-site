import type { CollectionConfig } from "payload";
import { allowRoles, readAuthenticated } from "../access";
import { PRODUCT_EDIT_ROLES } from "../access/roles";
import { legacyField } from "./fields/legacyField";

/**
 * Categories (Prompt 10 §8). Foundation phase: enough structure to model
 * the starter tree from the spec (parent/child, sort order, menu
 * visibility) without yet wiring per-category available-filters/specs —
 * that lands alongside the full product/variant model in a later phase.
 */
export const Categories: CollectionConfig = {
  slug: "categories",
  admin: {
    group: "Каталог",
    useAsTitle: "name",
    defaultColumns: ["name", "parent", "status", "sortOrder"],
  },
  access: {
    read: readAuthenticated,
    create: allowRoles(PRODUCT_EDIT_ROLES),
    update: allowRoles(PRODUCT_EDIT_ROLES),
    delete: allowRoles(PRODUCT_EDIT_ROLES),
  },
  versions: { drafts: true },
  fields: [
    {
      name: "name",
      type: "text",
      required: true,
      localized: true,
    },
    {
      name: "slug",
      type: "text",
      required: true,
      unique: true,
      admin: { description: "Використовується в URL, напр. sinks, planters." },
    },
    {
      name: "parent",
      type: "relationship",
      relationTo: "categories",
      admin: { description: "Залиште порожнім для категорії верхнього рівня." },
    },
    {
      name: "sortOrder",
      type: "number",
      defaultValue: 0,
    },
    {
      name: "showInMenu",
      type: "checkbox",
      defaultValue: true,
      admin: { position: "sidebar" },
    },
    {
      name: "oldUrl",
      type: "text",
      admin: {
        description: "Старий URL з Horoshop, якщо потрібен редирект.",
        position: "sidebar",
      },
    },
    {
      name: "seo",
      type: "group",
      fields: [
        { name: "metaTitle", type: "text", localized: true },
        { name: "metaDescription", type: "textarea", localized: true },
      ],
    },
    legacyField("category"),
  ],
};
