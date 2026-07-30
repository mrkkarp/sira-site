"use client";

import type { KeyboardEvent } from "react";
import type { Dictionary } from "@/i18n/get-dictionary";
import type { VariantChoice } from "@/lib/variant-model";
import { ProductImage } from "@/components/product/product-image";
import { cn } from "@/lib/cn";

/**
 * Colour swatch selector — Prompt 6 §4/§16 ("colour swatches, name, sample
 * photo... keyboard swatch selection"). Real per-choice photo + real
 * `colorLabel` text (never a fabricated hex chip — the source data has no
 * hex/RAL codes, only a photo and a free-text label per colour row).
 *
 * `role="listbox"`/`"option"` + arrow-key navigation mirrors the same
 * pattern already established in `ProductGallery`'s thumbnail strip, for
 * consistency and because native `<button>` + arrow-key `onKeyDown` is
 * simpler here than a full roving-tabindex radiogroup implementation.
 */
export function ColourSelector({
  choices,
  selectedId,
  onSelect,
  dictionary,
  brokenImageLabel,
}: {
  choices: VariantChoice[];
  selectedId: string | undefined;
  onSelect: (choiceId: string) => void;
  dictionary: Dictionary;
  brokenImageLabel: string;
}) {
  function handleKeyDown(event: KeyboardEvent) {
    if (event.key !== "ArrowRight" && event.key !== "ArrowLeft") return;
    event.preventDefault();
    const currentIndex = choices.findIndex(
      (choice) => choice.id === selectedId,
    );
    const delta = event.key === "ArrowRight" ? 1 : -1;
    const nextIndex =
      ((currentIndex === -1 ? 0 : currentIndex) + delta + choices.length) %
      choices.length;
    const next = choices[nextIndex];
    if (next) onSelect(next.id);
  }

  return (
    <div className="flex flex-col gap-(--space-2xs)">
      <span className="type-caption text-text-muted">
        {dictionary.product.colourLabel}
      </span>
      <div
        role="listbox"
        aria-label={dictionary.product.colourLabel}
        className="flex flex-wrap gap-(--space-2xs)"
        onKeyDown={handleKeyDown}
      >
        {choices.map((choice) => {
          const isSelected = choice.id === selectedId;
          return (
            <button
              key={choice.id}
              type="button"
              role="option"
              aria-selected={isSelected}
              aria-label={choice.label}
              disabled={!choice.available}
              onClick={() => onSelect(choice.id)}
              className={cn(
                "bg-surface-muted relative h-14 w-14 shrink-0 overflow-hidden border disabled:opacity-40",
                isSelected ? "border-text" : "border-transparent",
              )}
            >
              {choice.photo ? (
                <ProductImage
                  src={choice.photo}
                  alt={choice.label}
                  sizes="56px"
                  className="object-cover"
                  brokenLabel={brokenImageLabel}
                />
              ) : null}
            </button>
          );
        })}
      </div>
      <span className="type-caption text-text">
        {choices.find((choice) => choice.id === selectedId)?.label}
      </span>
    </div>
  );
}
