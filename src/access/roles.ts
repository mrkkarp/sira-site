/**
 * ODUDLAB admin — role model (Prompt 10 §5).
 *
 * Seven roles, each with an explicit can/cannot list. This file is the
 * single source of truth for role names and coarse-grained capability
 * checks; individual collections import from here rather than
 * re-declaring role logic, so a permission change only has to happen in
 * one place.
 *
 * NOTE (phase 1 / foundation): this starts intentionally coarse —
 * per-collection `access` functions below are enough to keep Viewer
 * read-only and keep Translator/Sales scoped away from destructive
 * actions. The finer-grained field-level and record-level rules called
 * for in the full spec (e.g. Sales Manager sees leads/orders but not
 * cost prices) get layered on in a later phase, on top of this same
 * `Role` union so nothing here needs to change shape.
 */

export const roles = [
  "superAdmin",
  "owner",
  "contentManager",
  "productManager",
  "salesManager",
  "translator",
  "viewer",
] as const;

export type Role = (typeof roles)[number];

export const roleLabels: Record<Role, string> = {
  superAdmin: "Super Admin",
  owner: "Owner",
  contentManager: "Контент-менеджер",
  productManager: "Менеджер товарів",
  salesManager: "Менеджер продажів",
  translator: "Перекладач",
  viewer: "Перегляд",
};

export type AdminUser = {
  id: string | number;
  role: Role;
};

export function hasAnyRole(
  user: AdminUser | null | undefined,
  allowed: readonly Role[],
): boolean {
  if (!user) return false;
  return allowed.includes(user.role);
}

/** Super Admin and Owner both have full access; only Super Admin can hard-delete, change roles, and edit security-sensitive settings. */
export const FULL_ACCESS_ROLES: readonly Role[] = ["superAdmin", "owner"];

/** Roles allowed to create/edit catalog content (products, categories, colours, collections). */
export const PRODUCT_EDIT_ROLES: readonly Role[] = [
  "superAdmin",
  "owner",
  "productManager",
];

/** Roles allowed to create/edit site pages, articles, projects, media, navigation. */
export const CONTENT_EDIT_ROLES: readonly Role[] = [
  "superAdmin",
  "owner",
  "contentManager",
];

/** Roles allowed to work leads/orders (read + status changes), but not edit product pricing/specs. */
export const SALES_ROLES: readonly Role[] = [
  "superAdmin",
  "owner",
  "salesManager",
];

/** Roles allowed to edit translated copy without touching structural/commerce fields. */
export const TRANSLATOR_ROLES: readonly Role[] = [
  "superAdmin",
  "owner",
  "translator",
];

/** Every authenticated admin user can at least read (Viewer's entire purpose). */
export const ANY_ADMIN_ROLES: readonly Role[] = roles;
