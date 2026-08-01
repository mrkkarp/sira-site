import type { ProductSpecEntry } from "@/lib/schemas/product";

/**
 * Matched on each entry's stable `key`, never on its display `label`: labels
 * are locale-dependent (verbatim Ukrainian from the legacy snapshot, the
 * translated dictionary string when built from Payload's typed specs), so
 * label matching would silently return an empty list on `/en` and `/pl` and
 * hide the entire "Монтаж" section in those languages.
 */
const INSTALLATION_SPEC_KEYS = new Set(["mountType", "connection"]);

/**
 * Picks out the real spec entries that describe how a product is installed
 * or connected (e.g. "Монтаж: накладний на стільницю", "Підключення:
 * можливе зі стіни або з підлоги") — used to populate the "Монтаж"
 * accordion section (Prompt 6 §11) without inventing installation
 * instructions that aren't in the data. Products with neither spec (most
 * non-sink categories) yield an empty array, and the accordion section is
 * omitted entirely rather than shown empty.
 */
export function getInstallationSpecEntries(
  specEntries: ProductSpecEntry[],
): ProductSpecEntry[] {
  return specEntries.filter(
    (entry) => entry.key != null && INSTALLATION_SPEC_KEYS.has(entry.key),
  );
}
