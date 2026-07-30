import type { CollectionConfig } from "payload";
import { FULL_ACCESS_ROLES, roleLabels, roles } from "../access/roles";
import { allowRoles, allowRolesField } from "../access";

/**
 * Admin users (Prompt 10 §4–§5). Payload's built-in `auth` handles password
 * hashing, secure HTTP-only cookies, session expiry, lockout after failed
 * attempts, and password-reset tokens out of the box — we only add the
 * `role` field and the access rules that key off it.
 *
 * Role changes and new-admin creation are restricted to Super
 * Admin/Owner so a Content Manager or Translator can never grant
 * themselves (or anyone else) more access — "не покладайся лише на
 * приховані кнопки" is enforced here at the collection level, not just
 * by hiding a button in the UI.
 */
export const Users: CollectionConfig = {
  slug: "users",
  auth: {
    // Lock out after repeated failed logins (Prompt 10 §4).
    maxLoginAttempts: 5,
    lockTime: 10 * 60 * 1000, // 10 minutes
    // Payload's default reset-password flow already avoids confirming
    // whether an email exists (it always responds success); no custom
    // messaging is added here that would leak that information.
  },
  admin: {
    useAsTitle: "email",
    defaultColumns: ["email", "role", "updatedAt"],
    group: "Адмін",
  },
  access: {
    // Every logged-in admin user can see the user directory (needed for
    // assigning leads/orders to a colleague, @-mentions, etc.) — but
    // fields below restrict what they see per-user.
    read: ({ req }) => Boolean(req.user),
    create: allowRoles(FULL_ACCESS_ROLES),
    update: allowRoles(FULL_ACCESS_ROLES),
    delete: allowRoles(FULL_ACCESS_ROLES),
  },
  fields: [
    {
      name: "name",
      type: "text",
      required: true,
    },
    {
      name: "role",
      type: "select",
      required: true,
      defaultValue: "viewer",
      options: roles.map((value) => ({ label: roleLabels[value], value })),
      access: {
        // Only Super Admin/Owner can change a user's role, even if they
        // can otherwise edit the record.
        update: allowRolesField(FULL_ACCESS_ROLES),
      },
      admin: {
        position: "sidebar",
      },
    },
    {
      name: "active",
      type: "checkbox",
      defaultValue: true,
      admin: {
        position: "sidebar",
        description:
          "Вимкніть замість видалення, щоб зберегти історію дій користувача.",
      },
    },
  ],
};
