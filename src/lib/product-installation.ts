import type { ProductSpecEntry } from "@/lib/schemas/product";

const INSTALLATION_LABELS = new Set(["Монтаж", "Підключення"]);

/**
 * Picks out the real, already-parsed spec entries that describe how a
 * product is installed/connected (e.g. "Монтаж: накладний на стільницю",
 * "Підключення: можливе зі стіни або з підлоги") — used to populate the
 * "Монтаж" accordion section (Prompt 6 §11) without inventing installation
 * instructions that aren't in the source export. Products with neither
 * label (most non-sink categories) yield an empty array, and the accordion
 * section is omitted entirely rather than shown empty.
 */
export function getInstallationSpecEntries(
  specEntries: ProductSpecEntry[],
): ProductSpecEntry[] {
  return specEntries.filter((entry) => INSTALLATION_LABELS.has(entry.label));
}
