"use client";

import { useId, useState } from "react";
import type { Dictionary } from "@/i18n/get-dictionary";
import type { ShopCategory } from "@/lib/schemas/product";
import type {
  FacetOption,
  FilterState,
  ColourFilterValue,
} from "@/lib/shop-filters";
import { toggleMultiValue } from "@/lib/shop-filters";
import { Checkbox } from "@/components/ui/checkbox";

export type ShopFacets = {
  mount: FacetOption<"freestanding" | "countertop" | "wall-mounted">[];
  placement: FacetOption<"indoor" | "outdoor">[];
  colour: FacetOption<ColourFilterValue>[];
  collections: (FacetOption<string> & { name: string })[];
  priceBounds: { min: number; max: number };
  widthBounds: { min: number; max: number } | null;
  heightBounds: { min: number; max: number } | null;
};

/**
 * The actual filter controls — shared by the always-applying desktop
 * sidebar and the mobile drawer's apply-on-submit local state. Purely
 * controlled (`value` + `onChange`) so each host decides when a change is
 * committed to the URL.
 */
export function FilterFieldsets({
  dictionary,
  category,
  lockedFacet,
  facets,
  value,
  onChange,
}: {
  dictionary: Dictionary;
  category?: ShopCategory;
  /**
   * The facet a subcategory URL has already decided, if any. `/rakovyny/
   * nakladni` *is* `mount=countertop`, so rendering the mount checkboxes there
   * would offer a control whose only real options are "no change" and "empty
   * the page" — and unticking it would silently contradict the `h1`. The
   * subcategory nav (`category-nav.tsx`) is how you move between the two.
   */
  lockedFacet?: "mount" | "placement";
  facets: ShopFacets;
  value: FilterState;
  onChange: (next: FilterState) => void;
}) {
  // Prompt 9 §2 (accessibility audit) — `DesktopFilterSidebar` (`hidden
  // lg:block`, always mounted) and `MobileFilterButton`'s drawer both render
  // a `FilterFieldsets` instance at the same time, so static ids like
  // `mount-freestanding` collided across the two DOM trees (duplicate-id,
  // breaking `<label htmlFor>` association — WCAG 1.3.1/4.1.2). `useId()`
  // gives each component instance its own unique, stable prefix.
  const uid = useId();
  const copy = dictionary.shop.filters;
  const mountLabels: Record<string, string> = {
    freestanding: copy.mountFreestanding,
    countertop: copy.mountCountertop,
    "wall-mounted": copy.mountWallMounted,
  };
  const placementLabels: Record<string, string> = {
    indoor: copy.placementIndoor,
    outdoor: copy.placementOutdoor,
  };
  const colourLabels: Record<ColourFilterValue, string> = {
    base: copy.colourBase,
    custom: copy.colourCustom,
  };

  return (
    <div className="flex flex-col gap-(--space-md)">
      {category === "sinks" &&
      lockedFacet !== "mount" &&
      facets.mount.some((f) => f.count > 0) ? (
        <fieldset className="flex flex-col gap-(--space-2xs)">
          <legend className="type-label text-text mb-(--space-3xs)">
            {copy.mountHeading}
          </legend>
          {facets.mount.map((option) => (
            <Checkbox
              key={option.value}
              id={`${uid}-mount-${option.value}`}
              label={`${mountLabels[option.value]} (${option.count})`}
              checked={value.mount.includes(option.value)}
              disabled={option.disabled && !value.mount.includes(option.value)}
              onChange={() =>
                onChange({
                  ...value,
                  mount: toggleMultiValue(value.mount, option.value),
                  page: 1,
                })
              }
            />
          ))}
        </fieldset>
      ) : null}

      {category === "planters" &&
      lockedFacet !== "placement" &&
      facets.placement.some((f) => f.count > 0) ? (
        <fieldset className="flex flex-col gap-(--space-2xs)">
          <legend className="type-label text-text mb-(--space-3xs)">
            {copy.placementHeading}
          </legend>
          {facets.placement.map((option) => (
            <Checkbox
              key={option.value}
              id={`${uid}-placement-${option.value}`}
              label={`${placementLabels[option.value]} (${option.count})`}
              checked={value.placement.includes(option.value)}
              disabled={
                option.disabled && !value.placement.includes(option.value)
              }
              onChange={() =>
                onChange({
                  ...value,
                  placement: toggleMultiValue(value.placement, option.value),
                  page: 1,
                })
              }
            />
          ))}
        </fieldset>
      ) : null}

      <fieldset className="flex flex-col gap-(--space-2xs)">
        <legend className="type-label text-text mb-(--space-3xs)">
          {copy.colourHeading}
        </legend>
        {facets.colour.map((option) => (
          <Checkbox
            key={option.value}
            id={`${uid}-colour-${option.value}`}
            label={`${colourLabels[option.value]} (${option.count})`}
            checked={value.colour.includes(option.value)}
            disabled={option.disabled && !value.colour.includes(option.value)}
            onChange={() =>
              onChange({
                ...value,
                colour: toggleMultiValue(value.colour, option.value),
                page: 1,
              })
            }
          />
        ))}
      </fieldset>

      {facets.collections.length > 0 ? (
        <fieldset className="flex flex-col gap-(--space-2xs)">
          <legend className="type-label text-text mb-(--space-3xs)">
            {copy.collectionHeading}
          </legend>
          {facets.collections.map((option) => (
            <Checkbox
              key={option.value}
              id={`${uid}-collection-${option.value}`}
              label={`${option.name} (${option.count})`}
              checked={value.collection.includes(option.value)}
              disabled={
                option.disabled && !value.collection.includes(option.value)
              }
              onChange={() =>
                onChange({
                  ...value,
                  collection: toggleMultiValue(value.collection, option.value),
                  page: 1,
                })
              }
            />
          ))}
        </fieldset>
      ) : null}

      <RangeField
        legend={copy.priceHeading}
        minPlaceholder={copy.priceMinPlaceholder}
        maxPlaceholder={copy.priceMaxPlaceholder}
        bounds={facets.priceBounds}
        range={value.price}
        onCommit={(range) => onChange({ ...value, price: range, page: 1 })}
      />

      {category === "sinks" && facets.widthBounds ? (
        <RangeField
          legend={copy.widthHeading}
          minPlaceholder={copy.priceMinPlaceholder}
          maxPlaceholder={copy.priceMaxPlaceholder}
          bounds={facets.widthBounds}
          range={value.width}
          onCommit={(range) => onChange({ ...value, width: range, page: 1 })}
        />
      ) : null}

      {category === "sinks" && facets.heightBounds ? (
        <RangeField
          legend={copy.heightHeading}
          minPlaceholder={copy.priceMinPlaceholder}
          maxPlaceholder={copy.priceMaxPlaceholder}
          bounds={facets.heightBounds}
          range={value.height}
          onCommit={(range) => onChange({ ...value, height: range, page: 1 })}
        />
      ) : null}
    </div>
  );
}

/** The committed range, as the two input strings that represent it. */
function rangeToText(range: { min?: number; max?: number } | undefined) {
  return {
    min: range?.min === undefined ? "" : String(range.min),
    max: range?.max === undefined ? "" : String(range.max),
  };
}

function RangeField({
  legend,
  minPlaceholder,
  maxPlaceholder,
  bounds,
  range,
  onCommit,
}: {
  legend: string;
  minPlaceholder: string;
  maxPlaceholder: string;
  bounds: { min: number; max: number };
  range: { min?: number; max?: number } | undefined;
  onCommit: (range: { min?: number; max?: number } | undefined) => void;
}) {
  // Own `useId()` rather than deriving from `legend` text — `legend` is
  // human copy (can repeat across categories/instances, e.g. "Ціна" on
  // every shop page, and isn't a valid id fragment if it contains spaces).
  const uid = useId();

  // These were `defaultValue` inputs, which meant the number the visitor had
  // typed survived every *external* clear: removing the price chip or hitting
  // "Скинути всі" emptied the URL and re-ran the query, but the sidebar still
  // read "від 5000" over a grid showing all nine products. `defaultValue` is
  // only consulted on mount, and the host's `key` remount fired before the
  // async `router.push` resolved, so it remounted with the *old* range.
  //
  // Controlled inputs plus React's "adjusting state when a prop changes"
  // pattern instead. Two deliberate details:
  //  - `synced` is compared by *value*, not object identity, so a parent
  //    re-render that rebuilds an equal `range` object doesn't wipe a
  //    half-typed number.
  //  - the resync is per field, so when committing `min` triggers a
  //    navigation the arriving state can't clear a `max` the visitor started
  //    typing in the meantime — only a field whose committed value actually
  //    changed gets overwritten.
  const incoming = rangeToText(range);
  const [draft, setDraft] = useState(incoming);
  const [synced, setSynced] = useState(incoming);

  if (incoming.min !== synced.min || incoming.max !== synced.max) {
    setDraft({
      min: incoming.min === synced.min ? draft.min : incoming.min,
      max: incoming.max === synced.max ? draft.max : incoming.max,
    });
    setSynced(incoming);
  }

  function commit(minRaw: string, maxRaw: string) {
    const min = minRaw === "" ? undefined : Number.parseFloat(minRaw);
    const max = maxRaw === "" ? undefined : Number.parseFloat(maxRaw);
    const minValid = min === undefined || Number.isFinite(min);
    const maxValid = max === undefined || Number.isFinite(max);
    if (!minValid || !maxValid) return;
    if (min !== undefined && max !== undefined && min > max) return;
    onCommit(min === undefined && max === undefined ? undefined : { min, max });
  }

  return (
    <fieldset className="flex flex-col gap-(--space-2xs)">
      <legend className="type-label text-text mb-(--space-3xs)">
        {legend}
      </legend>
      <div className="flex items-center gap-(--space-2xs)">
        <label className="sr-only" htmlFor={`${uid}-min`}>
          {minPlaceholder}
        </label>
        <input
          id={`${uid}-min`}
          type="number"
          inputMode="numeric"
          min={bounds.min}
          max={bounds.max}
          placeholder={String(bounds.min)}
          value={draft.min}
          onChange={(event) =>
            setDraft((prev) => ({ ...prev, min: event.target.value }))
          }
          onBlur={() => commit(draft.min, draft.max)}
          className="type-body-sm border-border-strong h-10 w-full min-w-0 border px-(--space-2xs)"
        />
        <span aria-hidden="true" className="text-text-muted">
          –
        </span>
        <label className="sr-only" htmlFor={`${uid}-max`}>
          {maxPlaceholder}
        </label>
        <input
          id={`${uid}-max`}
          type="number"
          inputMode="numeric"
          min={bounds.min}
          max={bounds.max}
          placeholder={String(bounds.max)}
          value={draft.max}
          onChange={(event) =>
            setDraft((prev) => ({ ...prev, max: event.target.value }))
          }
          onBlur={() => commit(draft.min, draft.max)}
          className="type-body-sm border-border-strong h-10 w-full min-w-0 border px-(--space-2xs)"
        />
      </div>
    </fieldset>
  );
}
