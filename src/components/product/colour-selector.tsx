"use client";

import { useRef } from "react";
import type { KeyboardEvent } from "react";
import type { Locale } from "@/i18n/config";
import type { Dictionary } from "@/i18n/get-dictionary";
import type { VariantChoice } from "@/lib/variant-model";
import { ProductImage } from "@/components/product/product-image";
import { Price } from "@/components/ui/price";
import { cn } from "@/lib/cn";

/**
 * Colour selector (Phase B redesign). Presents the colour choice as one
 * accessible `radiogroup` split into two clearly labeled sections:
 *
 *  - **Standard colours** — a real photo swatch + the real `colorLabel` for
 *    each catalogued colourway. Selecting one drives the normal buy flow.
 *  - **Custom colour** — a single, visually distinct option card (palette
 *    chip, never a duplicate product photo) that states up-front how its
 *    price differs (a real surcharge when we have one, otherwise
 *    "calculated separately") and carries the RAL/NCS matching note. This
 *    is the option that routes to the consultation CTA upstream.
 *
 * Semantics: `role="radiogroup"` with `role="radio"` + `aria-checked`,
 * roving `tabIndex` (only the active choice is tab-stoppable), and
 * arrow-key navigation that moves selection — the standard WAI-ARIA radio
 * group pattern. No option is ever hidden or left stale after a switch; the
 * active choice always has a strong visible border + label emphasis, plus
 * hover/focus-visible affordances.
 */
export function ColourSelector({
  choices,
  selectedId,
  onSelect,
  dictionary,
  locale,
  brokenImageLabel,
}: {
  choices: VariantChoice[];
  selectedId: string | undefined;
  onSelect: (choiceId: string) => void;
  dictionary: Dictionary;
  locale: Locale;
  brokenImageLabel: string;
}) {
  const t = dictionary.product;
  const buttonRefs = useRef<Record<string, HTMLButtonElement | null>>({});

  const standardChoices = choices.filter((choice) => choice.kind === "standard");
  const customChoices = choices.filter((choice) => choice.kind === "custom");

  const activeId =
    selectedId && choices.some((choice) => choice.id === selectedId)
      ? selectedId
      : choices[0]?.id;

  function moveSelection(delta: number) {
    const currentIndex = choices.findIndex((choice) => choice.id === activeId);
    const from = currentIndex === -1 ? 0 : currentIndex;
    const next = choices[(from + delta + choices.length) % choices.length];
    if (!next || !next.available) return;
    onSelect(next.id);
    buttonRefs.current[next.id]?.focus();
  }

  function handleKeyDown(event: KeyboardEvent) {
    switch (event.key) {
      case "ArrowRight":
      case "ArrowDown":
        event.preventDefault();
        moveSelection(1);
        break;
      case "ArrowLeft":
      case "ArrowUp":
        event.preventDefault();
        moveSelection(-1);
        break;
      default:
        break;
    }
  }

  /** Real, non-fabricated price signal for a custom choice: an exact surcharge
   * when the data has one, otherwise an honest "calculated separately" note. */
  function renderCustomPriceHint(choice: VariantChoice) {
    if (choice.surcharge > 0) {
      return (
        <span className="type-caption text-text inline-flex items-baseline gap-(--space-3xs)">
          <span aria-hidden="true">+</span>
          <Price amount={choice.surcharge} locale={locale} />
          <span className="text-text-muted">{t.colourSurchargeSuffix}</span>
        </span>
      );
    }
    if (choice.contactRequired) {
      return (
        <span className="type-caption text-text-muted">
          {t.colourCustomQuoteHint}
        </span>
      );
    }
    return null;
  }

  return (
    <section
      aria-label={t.colourSectionTitle}
      className="flex flex-col gap-(--space-xs)"
    >
      <h2 className="type-caption text-text-muted">{t.colourSectionTitle}</h2>

      <div
        role="radiogroup"
        aria-label={t.colourSectionTitle}
        className="flex flex-col gap-(--space-sm)"
        onKeyDown={handleKeyDown}
      >
        {standardChoices.length > 0 ? (
          <div className="flex flex-col gap-(--space-2xs)">
            <p className="type-caption text-text-muted">
              {t.colourStandardLabel}
            </p>
            <div className="flex flex-wrap gap-(--space-sm)">
              {standardChoices.map((choice) => {
                const isSelected = choice.id === activeId;
                return (
                  <button
                    key={choice.id}
                    ref={(el) => {
                      buttonRefs.current[choice.id] = el;
                    }}
                    type="button"
                    role="radio"
                    aria-checked={isSelected}
                    aria-label={choice.label}
                    tabIndex={isSelected ? 0 : -1}
                    disabled={!choice.available}
                    onClick={() => onSelect(choice.id)}
                    className="group flex flex-col items-center gap-(--space-3xs) outline-none disabled:opacity-40"
                  >
                    <span
                      className={cn(
                        "bg-surface-muted relative block h-14 w-14 shrink-0 overflow-hidden border-2 transition-colors",
                        isSelected
                          ? "border-text"
                          : "border-transparent group-hover:border-border-strong group-focus-visible:border-text",
                      )}
                    >
                      {choice.photo ? (
                        <ProductImage
                          src={choice.photo}
                          alt=""
                          sizes="56px"
                          className="object-cover"
                          brokenLabel={brokenImageLabel}
                        />
                      ) : null}
                    </span>
                    <span
                      className={cn(
                        "type-caption max-w-[6rem] text-center",
                        isSelected ? "text-text" : "text-text-muted",
                      )}
                    >
                      {choice.label}
                    </span>
                  </button>
                );
              })}
            </div>
          </div>
        ) : null}

        {customChoices.length > 0 ? (
          <div className="flex flex-col gap-(--space-2xs)">
            <p className="type-caption text-text-muted">{t.colourCustomLabel}</p>
            <div className="flex flex-col gap-(--space-2xs)">
              {customChoices.map((choice) => {
                const isSelected = choice.id === activeId;
                return (
                  <button
                    key={choice.id}
                    ref={(el) => {
                      buttonRefs.current[choice.id] = el;
                    }}
                    type="button"
                    role="radio"
                    aria-checked={isSelected}
                    aria-label={t.colourCustomOptionTitle}
                    tabIndex={isSelected ? 0 : -1}
                    disabled={!choice.available}
                    onClick={() => onSelect(choice.id)}
                    className={cn(
                      "flex w-full items-center gap-(--space-sm) border-2 p-(--space-2xs) text-left outline-none transition-colors disabled:opacity-40",
                      isSelected
                        ? "border-text bg-surface-muted"
                        : "border-border hover:border-border-strong focus-visible:border-text",
                    )}
                  >
                    {/* Palette chip — deliberately NOT a product photo, so the
                     * custom option can never duplicate a standard swatch and
                     * reads instantly as "any RAL/NCS colour". */}
                    <span
                      aria-hidden="true"
                      className="border-border block h-14 w-14 shrink-0 border"
                      style={{
                        background:
                          "conic-gradient(from 90deg, #d98c8c, #d9c48c, #a9d98c, #8cb8d9, #b08cd9, #d98c8c)",
                      }}
                    />
                    <span className="flex min-w-0 flex-col gap-(--space-3xs)">
                      <span className="type-body-sm text-text">
                        {t.colourCustomOptionTitle}
                      </span>
                      {renderCustomPriceHint(choice)}
                      <span className="type-caption text-text-muted">
                        {t.colourCustomNote}
                      </span>
                    </span>
                  </button>
                );
              })}
            </div>
          </div>
        ) : null}
      </div>
    </section>
  );
}
