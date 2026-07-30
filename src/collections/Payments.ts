import type { CollectionConfig } from "payload";
import { allowRoles } from "../access";
import { FULL_ACCESS_ROLES, SALES_ROLES } from "../access/roles";

/**
 * `Payments` (Prompt 8 §2.3/§9, Phase B). One payment attempt against
 * an `Order`. Never stores card numbers/CVV — LiqPay's hosted
 * checkout/widget handles card data entirely on its own side; this
 * collection only ever sees an amount, a status, and LiqPay's own
 * transaction id. `status`/`signatureVerified` are written exclusively
 * by the server-side, signature-verified LiqPay callback handler
 * (Phase F) via the Local API (which bypasses these admin-only access
 * rules by default) — no admin role is meant to hand-edit a payment's
 * status in normal operation, hence `update` is restricted to full
 * access only (manual/refund reconciliation, not routine editing).
 */
export const Payments: CollectionConfig = {
  slug: "payments",
  admin: {
    group: "Продажі",
    useAsTitle: "externalId",
    defaultColumns: ["orderId", "provider", "status", "amount", "createdAt"],
  },
  access: {
    read: allowRoles(SALES_ROLES),
    create: allowRoles(FULL_ACCESS_ROLES),
    update: allowRoles(FULL_ACCESS_ROLES),
    delete: allowRoles(FULL_ACCESS_ROLES),
  },
  fields: [
    {
      name: "orderId",
      type: "relationship",
      relationTo: "orders",
      required: true,
    },
    {
      name: "provider",
      type: "select",
      required: true,
      options: ["liqpay", "manual"],
    },
    {
      name: "amount",
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
      name: "status",
      type: "select",
      required: true,
      defaultValue: "pending",
      options: ["pending", "success", "failure", "reversed", "sandbox"],
    },
    {
      name: "externalId",
      type: "text",
      unique: true,
      admin: {
        description:
          "LiqPay-транзакції id — використовується для ідемпотентності callback-обробника.",
      },
    },
    { name: "signatureVerified", type: "checkbox", defaultValue: false },
    {
      name: "rawCallbackPayload",
      type: "textarea",
      admin: {
        description:
          "Опаковий запис для аудиту/спорів. Ніколи не містить даних картки.",
      },
    },
  ],
};
