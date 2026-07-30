import type { Field, NamedGroupField } from "payload";

/**
 * Shared builder for a `LocaleContent`-shaped snapshot field (Prompt 8
 * §2.2's `{ uk, en?, pl? }` shape), used on the new commerce
 * collections (`Carts`, `Orders`, `Leads`) added in Phase B.
 *
 * Deliberately a plain `group` with three explicit sub-fields, not
 * Payload's own `localized: true` flag: `localized` fields store one
 * value per locale but are only ever *read* one locale at a time
 * (or all at once via the special `locale: "all"` API option) — the
 * documents these appear on (a cart line, an order line, a lead) are
 * frozen snapshots copied from a product/option at a point in time,
 * not documents a translator opens and edits per-locale later. A
 * plain group reads back exactly the shape `LocaleContentSchema`
 * expects with a normal `payload.find()` call, no special locale
 * handling required.
 */
export function localeContentField(
  name: string,
  admin?: NamedGroupField["admin"],
): Field {
  return {
    name,
    type: "group",
    admin,
    fields: [
      { name: "uk", type: "text", required: true },
      { name: "en", type: "text" },
      { name: "pl", type: "text" },
    ],
  };
}
