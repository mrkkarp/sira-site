import type { Product, ProductVariant } from "@/lib/schemas/product";

/**
 * Typed variant/option model for the product configurator (Prompt 6 §4/§5).
 *
 * Only "colour" is populated from real data today — the real source export
 * (`products.source.json`) only ever distinguishes a "Сірий базовий" (base
 * grey) row from an optional "Свій колір" (custom colour) row per product
 * group. Mount type, ready-made size, and technical options (tap hole,
 * overflow, drain type, etc.) are NOT selectable variants in the real data —
 * `sinkType` (freestanding/countertop) is a fixed attribute of *which
 * product* you're looking at, not a choice within one product, and there is
 * no per-product size/technical-option data anywhere in the source export.
 *
 * The `kind` union below is deliberately kept wider than what's populated
 * today so a future product import with real mount/size/technical data can
 * be wired in via `buildVariantOptions` without changing the resolution
 * algorithm — but nothing here fabricates options that aren't backed by
 * real rows.
 */
export type VariantOptionKind = "colour" | "mount" | "size" | "technical";

/** Distinguishes a concrete, catalogued colourway ("standard") from the
 * open-ended custom RAL/NCS colour option ("custom"). Drives the two labeled
 * sections and the differing price/CTA treatment in the colour selector. */
export type ColourChoiceKind = "standard" | "custom";

export interface VariantChoice {
  /** Stable id used in the URL and as a selection key, e.g. "base" | "custom". */
  id: string;
  /** Real, human label — e.g. the source `color` field ("Сірий базовий"). */
  label: string;
  /** Whether this choice can currently be selected (always true today; kept
   * for the "block impossible values" requirement once real
   * mount/size dependency data exists). */
  available: boolean;
  /** A representative photo for this choice (used for colour swatches). */
  photo?: string;
  /** Standard (catalogued) colour vs the custom RAL/NCS option. */
  kind: ColourChoiceKind;
  /** The real price this choice resolves to (base price for standard, the
   * custom-colour row's price for custom). */
  price: number;
  /** Extra cost of this choice over the base/standard price, always ≥ 0.
   * Always 0 for the standard colour; 0 for a custom colour priced the same
   * as base. Derived here as the single source of truth so the UI never
   * recomputes a surcharge from raw prices. */
  surcharge: number;
  /** `true` when picking this choice must route to a consultation/quote CTA
   * instead of direct add-to-cart (custom colours whose final price/feasibility
   * need confirmation). Never true for the standard colour. */
  contactRequired: boolean;
}

export interface VariantOption {
  id: string;
  kind: VariantOptionKind;
  label: string;
  required: boolean;
  choices: VariantChoice[];
}

/** optionId -> choiceId */
export type VariantSelection = Record<string, string>;

export interface VariantModel {
  options: VariantOption[];
  /** Canonical selection key ("optionId:choiceId|...") -> the real variant
   * payload that selection resolves to. Built once per product; resolution
   * is then a plain lookup, never a chain of nested conditionals. */
  combinations: Record<string, ProductVariant>;
  /** The variant to use when no option has been selected yet (or the
   * product has no selectable options at all). */
  defaultSelection: VariantSelection;
}

/**
 * Builds the canonical lookup key for a selection. Sorting by option id
 * keeps the key stable regardless of insertion/selection order.
 */
export function variantSelectionKey(selection: VariantSelection): string {
  return Object.entries(selection)
    .filter(([, choiceId]) => choiceId != null && choiceId !== "")
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([optionId, choiceId]) => `${optionId}:${choiceId}`)
    .join("|");
}

/**
 * Derives the real, product-specific variant model from a `Product`. Only
 * ever produces a "colour" option, and only when the product genuinely has
 * more than one colour row — a single-variant product (no `customColour`)
 * gets zero options, since there's nothing to choose between.
 */
export function buildVariantModel(product: Product): VariantModel {
  const combinations: Record<string, ProductVariant> = {};
  const options: VariantOption[] = [];

  if (product.customColour) {
    const basePrice = product.base.price;
    const customPrice = product.customColour.price;
    const baseChoice: VariantChoice = {
      id: "base",
      label: product.base.colorLabel ?? product.base.sku,
      available: true,
      photo: product.base.photo,
      kind: "standard",
      price: basePrice,
      surcharge: 0,
      contactRequired: false,
    };
    const customChoice: VariantChoice = {
      id: "custom",
      label: product.customColour.colorLabel ?? product.customColour.sku,
      available: true,
      photo: product.customColour.photo,
      kind: "custom",
      price: customPrice,
      surcharge: Math.max(0, customPrice - basePrice),
      // A custom RAL/NCS colour defaults to a consultation flow (its final
      // price/feasibility needs confirming); an admin can opt a specific
      // product out via the variant status (see payload-flat-products.ts).
      contactRequired: product.customColour.contactRequired ?? true,
    };
    options.push({
      id: "colour",
      kind: "colour",
      label: "colour",
      required: true,
      choices: [baseChoice, customChoice],
    });
    combinations[variantSelectionKey({ colour: "base" })] = product.base;
    combinations[variantSelectionKey({ colour: "custom" })] =
      product.customColour;
  } else {
    combinations[variantSelectionKey({})] = product.base;
  }

  const defaultSelection: VariantSelection = product.customColour
    ? { colour: "base" }
    : {};

  return { options, combinations, defaultSelection };
}

export interface ResolvedVariant {
  /** The effective selection actually used to resolve this result — invalid
   * or stale option ids from e.g. a hand-edited URL are dropped rather than
   * carried through, but never silently replace a *valid* prior choice. */
  selection: VariantSelection;
  /** True once every required option has a valid choice AND that
   * combination maps to a real variant. Add-to-cart should only be enabled
   * when this is true. */
  isComplete: boolean;
  /** Required options that still need a choice before the combination is
   * complete (drives "shows what's missing" in §6). */
  missingOptionIds: string[];
  /** Populated when the selection references a choice id that doesn't
   * exist for its option (e.g. a corrupted URL) — the offending keys are
   * dropped from `selection` and reported here rather than crashing. */
  invalidOptionIds: string[];
  /** The resolved real variant data, once `isComplete` — undefined while
   * incomplete or when the (valid-looking) combination genuinely has no
   * matching variant. */
  variant?: ProductVariant;
  /** Set when `isComplete` is true but no combination matched — should not
   * happen for the colour-only model (every combination is enumerated), but
   * kept for when real mount/size dependency data introduces genuinely
   * unavailable combinations. */
  unavailableError?: string;
}

/**
 * Resolves a (possibly partial/stale) selection against a product's variant
 * model. Pure lookup-table resolution — no nested `if`/`switch` pyramid —
 * so adding a new axis later only means adding entries to `combinations`,
 * not new branches here.
 */
export function resolveVariant(
  model: VariantModel,
  selection: VariantSelection,
): ResolvedVariant {
  const invalidOptionIds: string[] = [];
  const cleaned: VariantSelection = {};

  for (const option of model.options) {
    const requested = selection[option.id];
    if (requested == null) continue;
    const choice = option.choices.find(
      (candidate) => candidate.id === requested,
    );
    if (!choice || !choice.available) {
      invalidOptionIds.push(option.id);
      continue;
    }
    cleaned[option.id] = requested;
  }

  // Fall back to the default only for options that were never validly
  // selected — never overwrite a previously-compatible, still-valid choice.
  const effective: VariantSelection = { ...model.defaultSelection, ...cleaned };

  const missingOptionIds = model.options
    .filter((option) => option.required && !effective[option.id])
    .map((option) => option.id);

  if (missingOptionIds.length > 0) {
    return {
      selection: effective,
      isComplete: false,
      missingOptionIds,
      invalidOptionIds,
    };
  }

  const key = variantSelectionKey(effective);
  const variant = model.combinations[key];

  if (!variant) {
    return {
      selection: effective,
      isComplete: false,
      missingOptionIds,
      invalidOptionIds,
      unavailableError: "unavailable_combination",
    };
  }

  return {
    selection: effective,
    isComplete: true,
    missingOptionIds: [],
    invalidOptionIds,
    variant,
  };
}
