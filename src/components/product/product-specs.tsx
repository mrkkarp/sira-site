import type { ProductSpecEntry } from "@/lib/schemas/product";
import { SpecificationRow } from "@/components/technical-drawing";

/**
 * Structured specs table — Prompt 6 §9. Renders the real "Характеристики"
 * label/value pairs parsed straight from the source export (see
 * `parseSpecEntries`); values already carry their real units as written by
 * ODUDLAB (e.g. "85 см", "~100 кг"), so there is no separate unit-formatting
 * step to centralise — the source text already is the correct display
 * string. Only ever renders real fields; returns nothing for the many
 * categories (everything besides sinks, currently) that have no
 * "Характеристики" block in the source at all.
 *
 * Presented as the specification table off ODUDLAB's own drawings: a position
 * number, the name, a leader across the gap, the value. The numbering is
 * `aria-hidden` — it is the sheet's ordinal, and the list already has order —
 * so what assistive tech gets is still exactly the label/value pairs it got
 * before, in a plain definition list.
 */
export function ProductSpecs({
  specEntries,
}: {
  specEntries: ProductSpecEntry[];
}) {
  if (specEntries.length === 0) return null;

  return (
    <dl className="border-drawing-line-subtle flex flex-col border-t">
      {specEntries.map((entry, index) => (
        <SpecificationRow
          key={entry.label}
          index={index + 1}
          label={entry.label}
          value={entry.value}
        />
      ))}
    </dl>
  );
}
