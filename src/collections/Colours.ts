import type { CollectionConfig } from "payload";
import { allowRoles, readAuthenticated } from "../access";
import { PRODUCT_EDIT_ROLES } from "../access/roles";
import { revalidateStorefront } from "../lib/revalidate-storefront";

/**
 * Colours (Prompt 10 §7 colour support). Mirrors the shape of the
 * existing frontend `ProductColourSchema` (src/lib/schemas/colour.ts) —
 * `digitalPreviewHex` + explicit disclaimer, `ralOrNcsReference` only
 * when confirmed, `physicalSampleAvailable` — so a later phase can wire
 * the storefront to read from here without renaming fields. Palette
 * intentionally does not rely on hex alone: `textureImage` is a real
 * photo of the cured/tinted sample, required before publish (checked in
 * the publish-checklist phase, not hard-required here since draft
 * colours may not have a photo yet).
 */
export const Colours: CollectionConfig = {
  slug: "colours",
  admin: {
    group: "Каталог",
    useAsTitle: "displayName",
    defaultColumns: [
      "displayName",
      "digitalPreviewHex",
      "physicalSampleAvailable",
    ],
  },
  access: {
    read: readAuthenticated,
    create: allowRoles(PRODUCT_EDIT_ROLES),
    update: allowRoles(PRODUCT_EDIT_ROLES),
    delete: allowRoles(PRODUCT_EDIT_ROLES),
  },
  versions: { drafts: true },
  // Colour name/hex/sample photo render in the product configurator, so an
  // edit here changes the cached catalogue.
  hooks: {
    afterChange: [
      async ({ doc }) => {
        await revalidateStorefront();
        return doc;
      },
    ],
    afterDelete: [
      async ({ doc }) => {
        await revalidateStorefront();
        return doc;
      },
    ],
  },
  fields: [
    {
      name: "displayName",
      type: "text",
      required: true,
      localized: true,
    },
    {
      name: "slug",
      type: "text",
      required: true,
      unique: true,
    },
    {
      name: "digitalPreviewHex",
      type: "text",
      required: true,
      admin: {
        description:
          "Екранне наближення кольору, напр. #A6A6A6. Не гарантія збігу пігменту — див. disclaimer.",
      },
    },
    {
      name: "textureImage",
      type: "upload",
      relationTo: "media",
      admin: { description: "Реальне фото застиглого/тонованого зразка." },
    },
    {
      name: "ralOrNcsReference",
      type: "text",
      admin: {
        description:
          "Лише якщо підтверджено з майстернею — інакше залиште порожнім.",
      },
    },
    {
      name: "textMode",
      type: "select",
      required: true,
      defaultValue: "dark",
      options: [
        { label: "Темний текст", value: "dark" },
        { label: "Світлий текст", value: "light" },
      ],
    },
    {
      name: "availableCategories",
      type: "relationship",
      relationTo: "categories",
      hasMany: true,
    },
    {
      name: "physicalSampleAvailable",
      type: "checkbox",
      defaultValue: false,
    },
    {
      name: "surcharge",
      type: "number",
      admin: {
        description:
          "Доплата за колір (UAH), якщо є. Залиште порожнім, якщо доплати немає.",
      },
    },
    {
      name: "disclaimer",
      type: "textarea",
      required: true,
      localized: true,
      defaultValue:
        "Колір на екрані — орієнтовний. Точний відтінок бетону залежить від партії цементу та умов освітлення.",
    },
  ],
};
