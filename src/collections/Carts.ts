import type { CollectionConfig } from "payload";
import { allowRoles } from "../access";
import { SALES_ROLES } from "../access/roles";
import { localeContentField } from "./fields/localeContentField";

/**
 * `Carts` (Prompt 8 §2.3/§6, Phase B). Server-persisted, keyed by
 * `sessionToken` (the opaque value stored in the cart cookie) rather
 * than a customer account — there is no storefront login, per §0.
 *
 * The admin `access` rules below only govern the `/admin` UI and the
 * REST/GraphQL API: the actual cart service (Phase D) reads/writes
 * these documents through Payload's Local API, which defaults to
 * `overrideAccess: true` — i.e. trusted server code always has full
 * access regardless of these role checks, exactly like a normal
 * customer-facing service talking to its own database. These rules
 * exist so Sales staff can inspect carts (e.g. to follow up on an
 * abandoned one) without giving them arbitrary DB access.
 */
export const Carts: CollectionConfig = {
  slug: "carts",
  admin: {
    group: "Продажі",
    useAsTitle: "sessionToken",
    defaultColumns: ["sessionToken", "currency", "updatedAt", "expiresAt"],
  },
  access: {
    read: allowRoles(SALES_ROLES),
    create: allowRoles(SALES_ROLES),
    update: allowRoles(SALES_ROLES),
    delete: allowRoles(SALES_ROLES),
  },
  fields: [
    {
      name: "sessionToken",
      type: "text",
      required: true,
      unique: true,
      index: true,
    },
    {
      name: "currency",
      type: "select",
      required: true,
      defaultValue: "UAH",
      options: [{ label: "UAH", value: "UAH" }],
    },
    {
      name: "lines",
      type: "array",
      fields: [
        /**
         * Not `required`: in `CATALOG_SOURCE=horoshop-snapshot` bridge
         * mode (Phase D/F), the domain's `ProductId` is the catalog's
         * real *slug* string (e.g. `"odri"`), not a Payload numeric id
         * — there are no real `products` documents to relate to yet
         * (Phase G's Horoshop importer populates them). This relationship
         * is a best-effort reference, populated only once a real numeric
         * id is available; `productRef` below is the lossless snapshot
         * that always round-trips, mirroring how `variantSku` (not a
         * relationship at all) already carries `variantId`.
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
        {
          name: "variantSku",
          type: "text",
          required: true,
          admin: {
            description:
              "SKU варіанта в масиві `variants` товару — окремої колекції варіантів немає.",
          },
        },
        { name: "sku", type: "text", required: true },
        localeContentField("name"),
        { name: "mediaId", type: "relationship", relationTo: "media" },
        { name: "quantity", type: "number", required: true, min: 1 },
        {
          name: "unitPrice",
          type: "group",
          fields: [
            {
              name: "currency",
              type: "select",
              defaultValue: "UAH",
              options: [{ label: "UAH", value: "UAH" }],
            },
            { name: "minorUnits", type: "number", required: true, min: 0 },
          ],
        },
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
        { name: "addedAt", type: "date", required: true },
      ],
    },
    {
      name: "expiresAt",
      type: "date",
      admin: {
        description: "Для фонового очищення покинутих кошиків. Необов'язково.",
      },
    },
  ],
};
