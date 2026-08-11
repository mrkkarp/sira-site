import type { Dictionary } from "@/i18n/get-dictionary";
import type { InfoMenuGroup } from "@/config/navigation";

/**
 * Resolving an `infoMenuGroups` entry against the dictionary. Shared, not
 * duplicated, because the desktop panel and the mobile menu render the same
 * groups and a second copy of this switch is exactly how the two would end up
 * disagreeing about what a link is called.
 *
 * The return type is widened to `Record<string, string>` on purpose: the
 * three namespaces have disjoint key sets, so indexing their union directly
 * is a type error, and every value in all three is already a string. Nothing
 * is lost — the `labels` discriminant is checked where it is written, in
 * `src/config/navigation.ts`.
 */
export function infoMenuLabels(
  dictionary: Dictionary,
  group: InfoMenuGroup,
): Record<string, string> {
  switch (group.labels) {
    case "footerLinks":
      return dictionary.footerLinks;
    case "designers":
      return dictionary.megaMenu.designers;
    case "footerNav":
      return dictionary.footerNav;
  }
}

/** Column headings always come from `footerNav`, so they need no discriminant
 *  — but they do need the cast, and it belongs next to its sibling. */
export function infoMenuHeading(dictionary: Dictionary, group: InfoMenuGroup) {
  return dictionary.footerNav[
    group.headingKey as keyof Dictionary["footerNav"]
  ];
}
