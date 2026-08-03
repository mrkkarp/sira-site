import type {
  CollectionAfterChangeHook,
  CollectionAfterDeleteHook,
  CollectionBeforeChangeHook,
  CollectionConfig,
  Field,
} from "payload";
import { allowRoles, allowRolesField, readAuthenticated } from "../access";
import { PRODUCT_EDIT_ROLES } from "../access/roles";
import {
  areaUnits,
  countUnits,
  dimensionField,
  lengthUnits,
  weightPerAreaUnits,
  weightUnits,
} from "./fields/specFields";
import { legacyField } from "./fields/legacyField";
import { revalidateStorefront } from "../lib/revalidate-storefront";

/**
 * Products (Prompt 10 §7, full model). Builds on the foundation-phase
 * identity/status fields with:
 *  - `specs`: the full typed characteristic taxonomy. Verified live on
 *    odudlab.com (Chrome MCP research) that only sinks currently carry
 *    real structured values (Матеріал/Висота/Діаметр/Вага/Тип змішувача/
 *    Підключення) — every other category is free-text today. All fields
 *    below are therefore optional; nothing here is guessed/fabricated
 *    per-category, values are filled in as real data becomes available.
 *  - `pricing`: cost price is field-level restricted to
 *    `PRODUCT_EDIT_ROLES` (hidden from Sales Manager/Translator/Viewer)
 *    per the spec's private-cost requirement.
 *  - `priceHistory` + `priceChangeReason`: an auto-populated audit trail
 *    of `basePrice` changes. `priceChangeReason` is `virtual: true` (with
 *    `admin.readOnly` explicitly left editable) so editors can type a
 *    reason at save time without Payload creating a real DB column for
 *    it — the `beforeChange` hook below reads it, appends a
 *    `priceHistory` entry, and the transient value is discarded before
 *    the document is persisted.
 *  - `variants`: flexible per-SKU option axes (colour/size/material/
 *    coating/mount/faucetType/hole/overflow/connection/kit/custom), each
 *    with its own SKU/price/status/lead-time override/stock note/
 *    photos/documents/Shopify id — the eventual bridge to a
 *    Shopify/Horoshop sync without duplicating the product model.
 *  - `documents`: product-level relationship to the separate
 *    `Documents` collection (PDF/CAD files), distinct from `gallery`
 *    (photography lives on `Media`).
 */

const recordBasePriceChange: CollectionBeforeChangeHook = ({
  data,
  originalDoc,
  req,
}) => {
  const nextBasePrice = data?.basePrice;
  const prevBasePrice = originalDoc?.basePrice;

  if (typeof nextBasePrice === "number" && nextBasePrice !== prevBasePrice) {
    const history = Array.isArray(originalDoc?.priceHistory)
      ? [...originalDoc.priceHistory]
      : [];
    history.push({
      oldValue: typeof prevBasePrice === "number" ? prevBasePrice : null,
      newValue: nextBasePrice,
      changedBy: req.user?.id ?? null,
      changedAt: new Date().toISOString(),
      reason: data?.priceChangeReason || undefined,
    });
    data.priceHistory = history;
  }

  // Transient input only — never persisted as its own column (see
  // `virtual: true` below), but strip it from `data` defensively in
  // case a future Payload version changes that behaviour.
  if (data && "priceChangeReason" in data) {
    delete data.priceChangeReason;
  }

  return data;
};

const revalidateOnChange: CollectionAfterChangeHook = async ({ doc }) => {
  await revalidateStorefront(
    doc && typeof doc === "object"
      ? (doc as { slug?: string }).slug
      : undefined,
  );
  return doc;
};

const revalidateOnDelete: CollectionAfterDeleteHook = async ({ doc }) => {
  await revalidateStorefront(
    doc && typeof doc === "object"
      ? (doc as { slug?: string }).slug
      : undefined,
  );
  return doc;
};

// Single source of truth for variant option axes: `colour` gets a real
// relationship field (below), every other axis is a free-text field
// generated from this list so adding an axis never means touching two
// places at once.
const variantOptionAxes = [
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
] as const;

export const Products: CollectionConfig = {
  slug: "products",
  admin: {
    group: "Каталог",
    useAsTitle: "name",
    defaultColumns: [
      "name",
      "sku",
      "editorialStatus",
      "stockStatus",
      "basePrice",
    ],
  },
  access: {
    read: readAuthenticated,
    create: allowRoles(PRODUCT_EDIT_ROLES),
    update: allowRoles(PRODUCT_EDIT_ROLES),
    delete: allowRoles(PRODUCT_EDIT_ROLES),
  },
  versions: { drafts: true },
  hooks: {
    beforeChange: [recordBasePriceChange],
    afterChange: [revalidateOnChange],
    afterDelete: [revalidateOnDelete],
  },
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
    },
    {
      name: "sku",
      type: "text",
      required: true,
      unique: true,
    },
    {
      name: "category",
      type: "relationship",
      relationTo: "categories",
      required: true,
    },
    {
      name: "availableColours",
      type: "relationship",
      relationTo: "colours",
      hasMany: true,
    },
    {
      name: "mainImage",
      type: "upload",
      relationTo: "media",
    },
    {
      name: "gallery",
      type: "upload",
      relationTo: "media",
      hasMany: true,
    },
    {
      name: "documents",
      type: "relationship",
      relationTo: "documents",
      hasMany: true,
      admin: {
        description:
          "Технічні файли товару (PDF/DWG/DXF/SKP/OBJ/STL/BIM) — окремо від фото в gallery.",
      },
    },
    {
      name: "shortDescription",
      type: "textarea",
      localized: true,
    },
    // Editorial status governs whether/how the record appears in the
    // admin and (eventually) whether the page is publicly reachable at
    // all. Stock status governs whether it can currently be *ordered*.
    // These answer two unrelated questions and must never be merged
    // into one field.
    {
      name: "editorialStatus",
      type: "select",
      required: true,
      defaultValue: "draft",
      options: [
        { label: "Чернетка", value: "draft" },
        { label: "На перевірці", value: "readyForReview" },
        { label: "Опубліковано", value: "published" },
        { label: "Заплановано", value: "scheduled" },
        { label: "Архів", value: "archived" },
        { label: "Знято з продажу", value: "discontinued" },
      ],
      admin: { position: "sidebar" },
    },
    {
      name: "stockStatus",
      type: "select",
      required: true,
      defaultValue: "madeToOrder",
      options: [
        { label: "В наявності", value: "inStock" },
        { label: "Під замовлення", value: "madeToOrder" },
        { label: "Доступно на замовлення", value: "availableForOrder" },
        { label: "Лише за запитом ціни", value: "quoteOnly" },
        { label: "Недоступно", value: "unavailable" },
      ],
      admin: { position: "sidebar" },
    },
    {
      name: "specs",
      type: "group",
      label: "Характеристики",
      admin: {
        description:
          "Структуровані характеристики. Реальні значення на сьогодні підтверджені лише для мийок (Матеріал/Висота/Діаметр/Вага/Тип змішувача/Підключення) — інші категорії поки без структурованих даних на сайті, тому всі поля тут необов'язкові й заповнюються по мірі появи підтверджених даних.",
      },
      fields: [
        { name: "material", type: "text", localized: true },
        { name: "technology", type: "text", localized: true },
        { name: "reinforcement", type: "text", localized: true },
        { name: "coating", type: "text", localized: true },
        {
          name: "usage",
          type: "select",
          hasMany: true,
          options: [
            { label: "Внутрішнє використання", value: "indoor" },
            { label: "Зовнішнє використання", value: "outdoor" },
          ],
        },
        dimensionField("width", "Ширина", lengthUnits),
        dimensionField("depth", "Глибина", lengthUnits),
        dimensionField("height", "Висота", lengthUnits),
        dimensionField("diameter", "Діаметр", lengthUnits),
        dimensionField("thickness", "Товщина", lengthUnits),
        dimensionField("weight", "Вага", weightUnits),
        dimensionField("weightPerArea", "Вага на м²", weightPerAreaUnits),
        dimensionField("drainDiameter", "Діаметр зливного отвору", lengthUnits),
        dimensionField(
          "coverageArea",
          "Площа покриття (на одиницю)",
          areaUnits,
        ),
        dimensionField("piecesPerPack", "Штук в упаковці", countUnits),
        {
          name: "mountType",
          type: "text",
          localized: true,
          admin: { description: "Напр. накладна, врізна, підстільна." },
        },
        { name: "faucetType", type: "text", localized: true },
        {
          name: "faucetHole",
          type: "text",
          localized: true,
          admin: { description: "Наявність/розташування отвору під змішувач." },
        },
        {
          name: "overflow",
          type: "text",
          localized: true,
          admin: { description: "Наявність переливу." },
        },
        { name: "wallConnection", type: "text", localized: true },
        { name: "floorConnection", type: "text", localized: true },
        {
          // The source export writes ONE combined "Підключення" sentence
          // (e.g. "можливе зі стіни або з підлоги", "приховане підлогове")
          // that does not reliably split into the separate
          // `wallConnection`/`floorConnection` fields above — forcing it into
          // either one would misstate which connection the text describes.
          // So the verbatim sentence lands here, and the two typed fields
          // stay available for when a product genuinely has separate,
          // confirmed wall- and floor-connection facts.
          name: "connection",
          type: "text",
          localized: true,
          admin: {
            description:
              "Загальний опис підключення, як він поданий у джерелі (напр. «можливе зі стіни або з підлоги»). Використовуйте окремі поля вище лише коли підключення зі стіни й з підлоги описані різними, підтвердженими фактами.",
          },
        },
        { name: "drainage", type: "text", localized: true },
        { name: "fixingMethod", type: "text", localized: true },
        { name: "packagingType", type: "text", localized: true },
        { name: "warranty", type: "text", localized: true },
        { name: "care", type: "textarea", localized: true },
        { name: "countryOfOrigin", type: "text" },
      ],
    },
    {
      name: "basePrice",
      type: "number",
      min: 0,
      admin: {
        description:
          'Базова ціна, UAH. Залиште порожнім для товарів "лише за запитом ціни".',
      },
    },
    {
      name: "priceChangeReason",
      type: "text",
      virtual: true,
      admin: {
        position: "sidebar",
        readOnly: false,
        description:
          'Причина зміни ціни (напр. "перегляд собівартості матеріалу"). Записується в історію нижче при збереженні; саме поле не зберігається окремою колонкою в БД.',
      },
    },
    {
      name: "priceHistory",
      type: "array",
      label: "Історія зміни ціни",
      admin: {
        readOnly: true,
        description:
          "Заповнюється автоматично при зміні базової ціни. Не редагується вручну.",
      },
      fields: [
        { name: "oldValue", type: "number" },
        { name: "newValue", type: "number" },
        { name: "changedBy", type: "relationship", relationTo: "users" },
        { name: "changedAt", type: "date" },
        { name: "reason", type: "text" },
      ],
    },
    {
      name: "pricing",
      type: "group",
      label: "Ціноутворення",
      fields: [
        {
          name: "currency",
          type: "select",
          defaultValue: "UAH",
          options: [{ label: "UAH", value: "UAH" }],
          admin: {
            readOnly: true,
            description:
              "Наразі лише UAH; мультивалютність — окрема майбутня фаза.",
          },
        },
        {
          name: "compareAtPrice",
          type: "number",
          min: 0,
          admin: {
            description: '"Стара" ціна для показу знижки. Необов\'язково.',
          },
        },
        {
          name: "costPrice",
          type: "number",
          min: 0,
          access: {
            read: allowRolesField(PRODUCT_EDIT_ROLES),
            update: allowRolesField(PRODUCT_EDIT_ROLES),
          },
          admin: {
            description:
              "Собівартість — приховано від Sales Manager/Перекладача/Перегляду, бачать лише ролі з доступом до редагування товарів.",
          },
        },
        {
          name: "vatState",
          type: "select",
          defaultValue: "included",
          options: [
            { label: "Включено в ціну", value: "included" },
            { label: "Без ПДВ", value: "excluded" },
          ],
        },
        { name: "promoPrice", type: "number", min: 0 },
        { name: "promoStartDate", type: "date" },
        { name: "promoEndDate", type: "date" },
      ],
    },
    {
      name: "leadTimeDays",
      type: "group",
      fields: [
        { name: "min", type: "number", min: 0 },
        { name: "max", type: "number", min: 0 },
        { name: "textOverride", type: "text", localized: true },
        {
          name: "urgentLeadTimeDays",
          type: "number",
          min: 0,
          admin: {
            description:
              "Прискорений термін виготовлення за додаткову оплату, якщо доступний.",
          },
        },
        {
          name: "productionCapacityStatus",
          type: "select",
          // Explicit short enum name: the auto-generated one (prefixed
          // with the versions-table path, e.g.
          // `products_v_version_lead_time_days_production_capacity_status`)
          // exceeds Postgres's 63-character identifier limit.
          enumName: "product_capacity_status",
          options: [
            { label: "Звичайне завантаження", value: "normal" },
            { label: "Підвищене завантаження", value: "high" },
            { label: "Виробництво призупинено", value: "paused" },
          ],
        },
        {
          name: "temporaryExtensionUntil",
          type: "date",
          admin: {
            description:
              "Тимчасове подовження терміну діє до цієї дати (напр. сезонне навантаження).",
          },
        },
      ],
    },
    {
      name: "variants",
      type: "array",
      label: "Варіанти",
      admin: {
        description:
          "Кожен рядок — конкретний варіант товару (SKU), що комбінує одну чи кілька осей опцій нижче. Порожні осі означають, що ця вісь не застосовна до цього варіанта.",
      },
      fields: [
        { name: "sku", type: "text", required: true, unique: true },
        {
          name: "optionAxes",
          type: "group",
          label: "Опції варіанта",
          fields: [
            { name: "colour", type: "relationship", relationTo: "colours" },
            ...variantOptionAxes.map((axis): Field =>
              axis === "custom"
                ? {
                    name: axis,
                    type: "text",
                    admin: {
                      description:
                        "Довільна вісь, якщо жодна з вище не підходить.",
                    },
                  }
                : { name: axis, type: "text" },
            ),
          ],
        },
        { name: "price", type: "number", min: 0 },
        {
          name: "status",
          type: "select",
          defaultValue: "madeToOrder",
          options: [
            { label: "В наявності", value: "inStock" },
            { label: "Під замовлення", value: "madeToOrder" },
            { label: "Доступно на замовлення", value: "availableForOrder" },
            { label: "Лише за запитом ціни", value: "quoteOnly" },
            { label: "Недоступно", value: "unavailable" },
          ],
        },
        { name: "leadTimeOverride", type: "text", localized: true },
        { name: "stockNote", type: "text", localized: true },
        { name: "photos", type: "upload", relationTo: "media", hasMany: true },
        {
          name: "documents",
          type: "relationship",
          relationTo: "documents",
          hasMany: true,
        },
        {
          name: "shopifyId",
          type: "text",
          admin: {
            description:
              "Ідентифікатор варіанта в Shopify, якщо/коли підключиться синхронізація.",
          },
        },
      ],
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
        { name: "focusKeyword", type: "text" },
        { name: "ogImage", type: "upload", relationTo: "media" },
        { name: "canonicalUrl", type: "text" },
        { name: "noIndex", type: "checkbox", defaultValue: false },
        {
          name: "oldUrls",
          type: "array",
          label: "Додаткові старі URL",
          fields: [{ name: "url", type: "text", required: true }],
        },
      ],
    },
    legacyField("product"),
  ],
};

// `colour` is handled separately above as a real relationship field;
// every other axis name comes from `variantOptionAxes`.
export type VariantOptionAxis = "colour" | (typeof variantOptionAxes)[number];
