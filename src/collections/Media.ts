import type { CollectionConfig } from "payload";
import { allowRoles, readAuthenticated } from "../access";
import { CONTENT_EDIT_ROLES, PRODUCT_EDIT_ROLES } from "../access/roles";

/**
 * Media library (`Медіа`, Prompt 10 §12). Foundation phase: local disk
 * storage under `media/` at the project root (outside `public/`, so raw
 * uploads aren't served as static files without going through Payload —
 * matches the backup rule "backups must not live in the public
 * directory" in spirit, and keeps room to swap in S3-compatible storage
 * for production later without moving anything the frontend depends on).
 *
 * Alt text is required before publish per spec, but Payload has no
 * built-in "except for decorative images" concept — enforced later via
 * the publish-checklist work in a subsequent phase, not by making `alt`
 * unconditionally required here (that would break intentionally
 * decorative uploads).
 */
export const Media: CollectionConfig = {
  slug: "media",
  admin: {
    group: "Адмін",
    useAsTitle: "filename",
  },
  access: {
    read: readAuthenticated,
    create: allowRoles([...CONTENT_EDIT_ROLES, ...PRODUCT_EDIT_ROLES]),
    update: allowRoles([...CONTENT_EDIT_ROLES, ...PRODUCT_EDIT_ROLES]),
    delete: allowRoles([...CONTENT_EDIT_ROLES, ...PRODUCT_EDIT_ROLES]),
  },
  upload: {
    staticDir: "../media",
    mimeTypes: [
      "image/jpeg",
      "image/png",
      "image/webp",
      "image/avif",
      "application/pdf",
    ],
  },
  fields: [
    {
      name: "alt",
      type: "text",
      admin: {
        description:
          "Обов'язково для фото товарів/сторінок. Залиште порожнім лише для суто декоративних зображень.",
      },
    },
    {
      name: "caption",
      type: "text",
    },
    {
      name: "credit",
      type: "text",
      admin: { description: "Фотограф / проєкт / джерело, якщо застосовно." },
    },
  ],
};
