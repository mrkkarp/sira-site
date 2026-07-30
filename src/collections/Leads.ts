import type { CollectionConfig } from "payload";
import { allowRoles } from "../access";
import { FULL_ACCESS_ROLES, SALES_ROLES } from "../access/roles";

/**
 * `Leads` (Prompt 8 §2.4/§3.1/§12/§15.2, Phase B). One flat collection
 * for all six form types (`contact`/`callback`/`quote`/`designer`/
 * `warranty`/`sample`), discriminated by `type` — matching the domain
 * `LeadRequest` union in `src/domain/leads/lead-request.ts` field for
 * field, so the repository mapping is a direct translation. Real
 * public submissions (Phase E) are written through the Local API with
 * `overrideAccess: true` from a rate-limited/honeypot-checked API
 * route, never directly through this admin-gated `create` access.
 */
export const Leads: CollectionConfig = {
  slug: "leads",
  admin: {
    group: "Продажі",
    useAsTitle: "name",
    defaultColumns: ["type", "name", "phone", "status", "createdAt"],
  },
  access: {
    read: allowRoles(SALES_ROLES),
    create: allowRoles(SALES_ROLES),
    update: allowRoles(SALES_ROLES),
    delete: allowRoles(FULL_ACCESS_ROLES),
  },
  fields: [
    {
      name: "type",
      type: "select",
      required: true,
      options: [
        "contact",
        "callback",
        "quote",
        "designer",
        "warranty",
        "sample",
      ],
      admin: { position: "sidebar" },
    },
    {
      name: "status",
      type: "select",
      required: true,
      defaultValue: "new",
      options: [
        "new",
        "inProgress",
        "waitingForCustomer",
        "quoted",
        "won",
        "lost",
        "spam",
        "closed",
      ],
      admin: { position: "sidebar" },
    },
    {
      name: "locale",
      type: "select",
      required: true,
      options: ["uk", "en", "pl"],
      admin: { position: "sidebar" },
    },
    {
      name: "sourcePath",
      type: "text",
      admin: {
        description:
          "Шлях сторінки, з якої надіслано форму (без query-параметрів, щоб не зберігати PII з трекінгу).",
      },
    },
    { name: "name", type: "text", required: true },
    { name: "phone", type: "text", required: true },
    {
      name: "email",
      type: "text",
      admin: {
        description:
          "Обов'язково лише для типу «designer» — валідується на сервері (Zod), не тут.",
      },
    },
    {
      name: "message",
      type: "textarea",
      admin: {
        condition: (_data, siblingData) =>
          ["contact", "quote", "designer"].includes(siblingData?.type),
      },
    },
    {
      name: "preferredTime",
      type: "text",
      admin: {
        condition: (_data, siblingData) => siblingData?.type === "callback",
      },
    },
    {
      name: "productId",
      type: "relationship",
      relationTo: "products",
      admin: {
        condition: (_data, siblingData) =>
          ["quote", "warranty"].includes(siblingData?.type),
      },
    },
    {
      name: "variantSku",
      type: "text",
      admin: {
        condition: (_data, siblingData) => siblingData?.type === "quote",
      },
    },
    {
      name: "quantity",
      type: "number",
      min: 1,
      admin: {
        condition: (_data, siblingData) => siblingData?.type === "quote",
      },
    },
    {
      name: "companyName",
      type: "text",
      admin: {
        condition: (_data, siblingData) => siblingData?.type === "designer",
      },
    },
    {
      name: "portfolioUrl",
      type: "text",
      admin: {
        condition: (_data, siblingData) => siblingData?.type === "designer",
      },
    },
    {
      name: "orderNumber",
      type: "text",
      admin: {
        condition: (_data, siblingData) => siblingData?.type === "warranty",
      },
    },
    {
      name: "issueDescription",
      type: "textarea",
      admin: {
        condition: (_data, siblingData) => siblingData?.type === "warranty",
      },
    },
    {
      name: "photoIds",
      type: "relationship",
      relationTo: "media",
      hasMany: true,
      admin: {
        condition: (_data, siblingData) => siblingData?.type === "warranty",
      },
    },
    {
      name: "address",
      type: "text",
      admin: {
        condition: (_data, siblingData) => siblingData?.type === "sample",
      },
    },
    {
      name: "productIds",
      type: "relationship",
      relationTo: "products",
      hasMany: true,
      admin: {
        condition: (_data, siblingData) => siblingData?.type === "sample",
      },
    },
  ],
};
