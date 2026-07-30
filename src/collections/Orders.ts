import type { CollectionConfig, Field } from "payload";
import { allowRoles } from "../access";
import { SALES_ROLES } from "../access/roles";
import { localeContentField } from "./fields/localeContentField";

/**
 * `Orders` (Prompt 8 §2.3/§11, Phase B). Every order line is a frozen
 * snapshot (own `sku`/`name`/`unitPrice`, not a live reference resolved
 * through `productId`) so that a later edit to a product's name/price
 * never rewrites what an existing order shows — the exact "order
 * snapshot" requirement from the spec's §0 analysis. `status` is only
 * ever transitioned by the order service (Phase F), specifically
 * `awaitingPayment -> paid` only from the signature-verified LiqPay
 * callback handler, never from a client redirect.
 */
const deliveryTypeCondition =
  (...types: string[]) =>
  (_data: unknown, siblingData: Record<string, unknown>) =>
    typeof siblingData?.type === "string" && types.includes(siblingData.type);

const deliveryMethodFields: Field[] = [
  {
    name: "type",
    type: "select",
    required: true,
    options: ["novaPoshtaBranch", "novaPoshtaCourier", "courier", "pickup"],
  },
  {
    name: "cityName",
    type: "text",
    admin: {
      condition: deliveryTypeCondition(
        "novaPoshtaBranch",
        "novaPoshtaCourier",
        "courier",
      ),
    },
  },
  {
    name: "branchNumber",
    type: "text",
    admin: { condition: deliveryTypeCondition("novaPoshtaBranch") },
  },
  {
    name: "branchAddress",
    type: "text",
    admin: { condition: deliveryTypeCondition("novaPoshtaBranch") },
  },
  {
    name: "address",
    type: "text",
    admin: { condition: deliveryTypeCondition("novaPoshtaCourier", "courier") },
  },
  {
    name: "stockistNote",
    type: "text",
    admin: {
      condition: deliveryTypeCondition("pickup"),
      description:
        "Немає окремої колекції `Stockists` ще — вкажіть точку самовивозу текстом до появи такої колекції.",
    },
  },
];

export const Orders: CollectionConfig = {
  slug: "orders",
  admin: {
    group: "Продажі",
    useAsTitle: "orderNumber",
    defaultColumns: ["orderNumber", "status", "customer", "createdAt"],
  },
  access: {
    read: allowRoles(SALES_ROLES),
    create: allowRoles(SALES_ROLES),
    update: allowRoles(SALES_ROLES),
    delete: allowRoles(SALES_ROLES),
  },
  fields: [
    {
      name: "orderNumber",
      type: "text",
      required: true,
      unique: true,
      index: true,
    },
    {
      name: "lines",
      type: "array",
      minRows: 1,
      fields: [
        /**
         * Not `required`: same `CATALOG_SOURCE=horoshop-snapshot`
         * bridge-mode caveat as `Carts.lines[].productId` (see
         * `Carts.ts`) — `ProductId` is a slug string today, not a
         * Payload numeric id, so this relationship is only a
         * best-effort reference. `productRef` below is the lossless
         * snapshot the domain mapper actually round-trips through,
         * mirroring `variantSku`/`variantId`.
         */
        { name: "productId", type: "relationship", relationTo: "products" },
        {
          name: "productRef",
          type: "text",
          required: true,
          admin: {
            description:
              "Raw domain ProductId string (a slug in horoshop-snapshot bridge mode) — always populated, unlike the best-effort `productId` relationship above.",
          },
        },
        { name: "variantSku", type: "text", required: true },
        { name: "sku", type: "text", required: true },
        localeContentField("name"),
        { name: "mediaId", type: "relationship", relationTo: "media" },
        { name: "quantity", type: "number", required: true, min: 1 },
        { name: "unitPriceMinorUnits", type: "number", required: true, min: 0 },
        { name: "lineTotalMinorUnits", type: "number", required: true, min: 0 },
        {
          name: "options",
          type: "array",
          fields: [
            {
              name: "optionKey",
              type: "select",
              required: true,
              options: [
                "colour",
                "size",
                "material",
                "coating",
                "mount",
                "faucetType",
                "hole",
                "overflow",
                "connection",
                "kit",
                "custom",
              ],
            },
            { name: "value", type: "text", required: true },
            localeContentField("label"),
          ],
        },
      ],
    },
    {
      name: "currency",
      type: "select",
      required: true,
      defaultValue: "UAH",
      options: [{ label: "UAH", value: "UAH" }],
    },
    {
      name: "totals",
      type: "group",
      fields: [
        { name: "subtotalMinorUnits", type: "number", required: true, min: 0 },
        {
          name: "discountTotalMinorUnits",
          type: "number",
          required: true,
          min: 0,
          defaultValue: 0,
        },
        {
          name: "deliveryTotalMinorUnits",
          type: "number",
          required: true,
          min: 0,
          defaultValue: 0,
        },
        { name: "totalMinorUnits", type: "number", required: true, min: 0 },
      ],
    },
    {
      name: "deliveryMethod",
      type: "group",
      fields: deliveryMethodFields,
    },
    {
      name: "customer",
      type: "group",
      fields: [
        { name: "fullName", type: "text", required: true },
        { name: "phone", type: "text", required: true },
        { name: "email", type: "text" },
        { name: "companyName", type: "text" },
        { name: "notes", type: "text" },
      ],
    },
    {
      name: "status",
      type: "select",
      required: true,
      defaultValue: "pending",
      options: [
        "pending",
        "awaitingPayment",
        "paid",
        "processing",
        "shipped",
        "completed",
        "cancelled",
        "refunded",
        "failed",
      ],
      admin: { position: "sidebar" },
    },
    {
      name: "paymentId",
      type: "relationship",
      relationTo: "payments",
      admin: { position: "sidebar" },
    },
    { name: "notes", type: "textarea" },
  ],
};
