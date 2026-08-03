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
      /**
       * What this file *is*, as opposed to what it depicts.
       *
       * The catalogue carries 17 dimensioned technical drawings among its
       * product images, and until this field existed nothing distinguished
       * them: they arrived through the same Horoshop gallery export as the
       * photographs, under the same product-name filenames (compare
       * `square-nakladna-59954535570175_….jpg`, a drawing, with the other
       * `square-nakladna-*.jpg`, which are photographs). Pixel statistics
       * don't separate them either — a washbasin shot on seamless white
       * scores like a line drawing on every cheap measure.
       *
       * So it is recorded, not inferred. A drawing is still worth showing —
       * a buyer wants the millimetres — but it must never stand in for a
       * photograph: not as the gallery's opening frame, not as a category
       * tile, not as the image beside an editorial paragraph.
       */
      name: "kind",
      type: "select",
      required: true,
      defaultValue: "photo",
      options: [
        { label: "Фотографія або візуалізація", value: "photo" },
        { label: "Технічне креслення", value: "drawing" },
      ],
      admin: {
        description:
          "«Технічне креслення» — для габаритних креслень і розрізів. Такі файли показуються в галереї окремо й ніколи не стають головним фото товару.",
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
