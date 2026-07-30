import { Fragment } from "react";
import type { ProductSpecEntry } from "@/lib/schemas/product";

/**
 * Structured specs table — Prompt 6 §9. Renders the real "Характеристики"
 * label/value pairs parsed straight from the source export (see
 * `parseSpecEntries`); values already carry their real units as written by
 * ODUDLAB (e.g. "85 см", "~100 кг"), so there is no separate unit-formatting
 * step to centralise — the source text already is the correct display
 * string. Only ever renders real fields; returns nothing for the many
 * categories (everything besides sinks, currently) that have no
 * "Характеристики" block in the source at all.
 */
export function ProductSpecs({
  specEntries,
}: {
  specEntries: ProductSpecEntry[];
}) {
  if (specEntries.length === 0) return null;

  return (
    <dl className="grid grid-cols-[auto_1fr] gap-x-(--space-sm) gap-y-(--space-2xs)">
      {specEntries.map((entry) => (
        <Fragment key={entry.label}>
          <dt className="type-body-sm text-text-muted">{entry.label}</dt>
          <dd className="type-body-sm text-text">{entry.value}</dd>
        </Fragment>
      ))}
    </dl>
  );
}
