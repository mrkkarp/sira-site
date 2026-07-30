import type { CollectionConfig, Block } from "payload";
import { allowRoles, readAuthenticated } from "../access";
import { CONTENT_EDIT_ROLES } from "../access/roles";

/**
 * Site pages + block-based page builder (Prompt 10 §9). Foundation
 * phase: only 3 of the 30 named block types are implemented (Hero, Rich
 * Text, Spacer) to prove out the architecture — every block gets
 * title/internal-label/visibility fields so later blocks slot into the
 * same shape. The remaining 27 block types (Product Grid, Colour
 * Palette, FAQ, Testimonials, Custom HTML gated to Super Admin, etc.)
 * are a later phase, once the underlying data (products/colours/FAQ) has
 * matching Payload collections to reference.
 */
const blockBase: Block["fields"] = [
  {
    name: "internalLabel",
    type: "text",
    admin: { description: "Лише для адмінки — не показується на сайті." },
  },
  {
    name: "hideOnMobile",
    type: "checkbox",
    defaultValue: false,
  },
  {
    name: "hideOnDesktop",
    type: "checkbox",
    defaultValue: false,
  },
];

const HeroBlock: Block = {
  slug: "hero",
  labels: { singular: "Hero", plural: "Hero" },
  fields: [
    ...blockBase,
    { name: "heading", type: "text", localized: true, required: true },
    { name: "subheading", type: "textarea", localized: true },
    { name: "image", type: "upload", relationTo: "media" },
  ],
};

const RichTextBlock: Block = {
  slug: "richText",
  labels: { singular: "Текстовий блок", plural: "Текстові блоки" },
  fields: [
    ...blockBase,
    { name: "content", type: "textarea", localized: true, required: true },
  ],
};

const SpacerBlock: Block = {
  slug: "spacer",
  labels: { singular: "Відступ", plural: "Відступи" },
  fields: [
    ...blockBase,
    {
      name: "size",
      type: "select",
      defaultValue: "md",
      options: ["sm", "md", "lg", "xl"].map((value) => ({
        label: value,
        value,
      })),
    },
  ],
};

export const Pages: CollectionConfig = {
  slug: "pages",
  admin: {
    group: "Сторінки",
    useAsTitle: "title",
    defaultColumns: ["title", "slug", "status", "updatedAt"],
  },
  access: {
    read: readAuthenticated,
    create: allowRoles(CONTENT_EDIT_ROLES),
    update: allowRoles(CONTENT_EDIT_ROLES),
    delete: allowRoles(CONTENT_EDIT_ROLES),
  },
  versions: {
    drafts: {
      autosave: { interval: 2000 },
    },
  },
  fields: [
    {
      name: "title",
      type: "text",
      required: true,
      localized: true,
    },
    {
      name: "slug",
      type: "text",
      required: true,
      unique: true,
      admin: {
        description: "Напр. about, colours, contact — без початкового /.",
      },
    },
    {
      name: "status",
      type: "select",
      required: true,
      defaultValue: "draft",
      options: [
        { label: "Чернетка", value: "draft" },
        { label: "На перевірці", value: "review" },
        { label: "Заплановано", value: "scheduled" },
        { label: "Опубліковано", value: "published" },
        { label: "Архів", value: "archived" },
      ],
      admin: { position: "sidebar" },
    },
    {
      name: "publishAt",
      type: "date",
      admin: {
        position: "sidebar",
        description: "Для запланованої публікації.",
      },
    },
    {
      name: "blocks",
      type: "blocks",
      blocks: [HeroBlock, RichTextBlock, SpacerBlock],
    },
    {
      name: "seo",
      type: "group",
      fields: [
        { name: "metaTitle", type: "text", localized: true },
        { name: "metaDescription", type: "textarea", localized: true },
        { name: "ogImage", type: "upload", relationTo: "media" },
      ],
    },
  ],
};
