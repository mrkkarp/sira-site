import type { CollectionConfig } from "payload";
import { allowRoles, readAuthenticated } from "../access";

/**
 * `Redirects` (Prompt 8 §1/§8, Phase B). Legacy Horoshop URLs (and any
 * future old URL) that must 301 to a new path. Populated by the
 * Horoshop importer (Phase G) from each product/category's own
 * `oldUrl`/`oldUrls` fields, plus editable by hand for one-off cases —
 * a single flat table is simpler for the (future) middleware to query
 * than scattering redirect logic across every collection.
 */
export const Redirects: CollectionConfig = {
  slug: "redirects",
  admin: {
    group: "Технічне",
    useAsTitle: "fromPath",
    defaultColumns: ["fromPath", "toPath", "statusCode", "active"],
  },
  access: {
    read: readAuthenticated,
    create: allowRoles([
      "superAdmin",
      "owner",
      "contentManager",
      "productManager",
    ]),
    update: allowRoles([
      "superAdmin",
      "owner",
      "contentManager",
      "productManager",
    ]),
    delete: allowRoles([
      "superAdmin",
      "owner",
      "contentManager",
      "productManager",
    ]),
  },
  fields: [
    {
      name: "fromPath",
      type: "text",
      required: true,
      unique: true,
      index: true,
    },
    { name: "toPath", type: "text", required: true },
    {
      name: "statusCode",
      type: "select",
      required: true,
      defaultValue: "301",
      options: ["301", "302"],
    },
    { name: "note", type: "text" },
    { name: "active", type: "checkbox", defaultValue: true },
  ],
};
