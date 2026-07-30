import type { Access, FieldAccess } from "payload";
import { FULL_ACCESS_ROLES, hasAnyRole, type Role } from "./roles";

/**
 * Payload access-control factory: allow when the logged-in user's role is
 * in `allowed`. Used for collection-level `create`/`update`/`delete`.
 * Every collection in this project wires its access functions through
 * here rather than inlining role checks, per Prompt 10 §5's requirement
 * that permissions not be scattered/duplicated across the codebase.
 */
export function allowRoles(allowed: readonly Role[]): Access {
  return ({ req }) =>
    hasAnyRole(
      req.user as unknown as { id: string | number; role: Role } | undefined,
      allowed,
    );
}

/** Field-level equivalent of `allowRoles`, for hiding/locking specific fields (e.g. cost price) from roles that can otherwise edit the record. */
export function allowRolesField(allowed: readonly Role[]): FieldAccess {
  return ({ req }) =>
    hasAnyRole(
      req.user as unknown as { id: string | number; role: Role } | undefined,
      allowed,
    );
}

/** Any authenticated admin user can read — Viewer's entire purpose is read-only access. Public/anonymous requests are denied; the storefront reads published content through its own server-side data layer, not the Payload admin API. */
export const readAuthenticated: Access = ({ req }) => Boolean(req.user);

/** Only Super Admin/Owner — used for hard-delete and security-sensitive singletons. */
export const readWriteFullAccessOnly: Access = allowRoles(FULL_ACCESS_ROLES);
