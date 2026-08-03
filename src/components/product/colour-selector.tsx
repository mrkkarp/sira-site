"use client";

import { useRef } from "react";
import type { KeyboardEvent, ReactNode } from "react";
import type { Locale } from "@/i18n/config";
import type { Dictionary } from "@/i18n/get-dictionary";
import type { VariantChoice } from "@/lib/variant-model";
import { ProductImage } from "@/components/product/product-image";
import { Price } from "@/components/ui/price";
import { DrawingMarker } from "@/components/technical-drawing";
import { cn } from "@/lib/cn";

/**
 * Colour selector (Phase B redesign, restyled onto the drawing system).
 * Presents the colour choice as one accessible `radiogroup` of numbered
 * option plates:
 *
 *  - **Standard colours** — a real photo swatch + the real `colorLabel` for
 *    each catalogued colourway, stated as carrying no surcharge.
 *  - **Custom colour** — a visually distinct plate (palette chip, never a
 *    duplicate product photo) that states up-front how its price differs (the
 *    real surcharge when we have one) and carries the RAL/NCS matching note.
 *    This is the option that routes to the consultation CTA upstream — an
 *    inline one, never a popup.
 *
 * Each plate is a position number, a category label, a rule and the choice
 * itself: the anatomy of a row in the specification table on ODUDLAB's own
 * drawings. Selection is signalled three ways at once — ink border, filled
 * position marker, and the rule drawing itself across the plate — because the
 * brief rules out both bulky rounded cards and selection-by-tint. All three
 * are paint or transform on a box whose border width never changes, so
 * choosing a colour never nudges the layout.
 *
 * Semantics: `role="radiogroup"` with `role="radio"` + `aria-checked`,
 * roving `tabIndex` (only the active choice is tab-stoppable), and
 * arrow-key navigation that moves selection — the standard WAI-ARIA radio
 * group pattern. No option is ever hidden or left stale after a switch.
 *
 * A plate carries no `aria-label`. Naming it just "Сірий базовий" while it
 * visibly reads "Стандартний колір / Сірий базовий / Без доплати" breaks Label
 * in Name (WCAG 2.5.3): someone driving the page by voice would say what they
 * see and hit nothing. The marker, the rule and the swatch are all
 * `aria-hidden`, so letting the plate name itself yields exactly its three
 * real lines — category, colour, price consequence.
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

  return (
    <section
      aria-label={t.colourSectionTitle}
      className="flex flex-col gap-(--space-xs)"
    >
      <h2 className="type-caption text-text-muted">{t.colourSectionTitle}</h2>

      <div
        role="radiogroup"
        aria-label={t.colourSectionTitle}
        className="flex flex-col gap-(--space-2xs)"
        onKeyDown={handleKeyDown}
      >
        {choices.map((choice, index) => {
          const isSelected = choice.id === activeId;
          const isCustom = choice.kind === "custom";

          return (
            <button
              key={choice.id}
              ref={(el) => {
                buttonRefs.current[choice.id] = el;
              }}
              type="button"
              role="radio"
              aria-checked={isSelected}
              tabIndex={isSelected ? 0 : -1}
              disabled={!choice.available}
              onClick={() => onSelect(choice.id)}
              className={cn(
                "group flex w-full flex-col gap-(--space-2xs) border p-(--space-sm) text-left transition-colors duration-(--duration-normal) ease-(--ease-nav) outline-none disabled:opacity-40",
                isSelected
                  ? "border-text"
                  : "border-drawing-line-subtle hover:border-drawing-line",
              )}
            >
              <span className="flex items-center gap-(--drawing-gap)">
                <DrawingMarker filled={isSelected}>{index + 1}</DrawingMarker>
                <span className="type-drawing-label text-drawing-text">
                  {isCustom ? t.colourCustomLabel : t.colourStandardLabel}
                </span>
              </span>

              {/* The plate's rule. Always present as construction weight, with
                  an ink overlay that draws itself across on hover and stays
                  drawn while selected — the "animated line" the brief asks for,
                  as a transform, so it costs one composited frame. */}
              <span
                aria-hidden="true"
                className="bg-drawing-line-subtle relative block h-(--drawing-stroke) w-full"
              >
                <span
                  className={cn(
                    "bg-text absolute inset-0 origin-left transition-transform duration-(--duration-normal) ease-(--ease-nav)",
                    isSelected
                      ? "scale-x-100"
                      : "scale-x-0 group-hover:scale-x-100 group-focus-visible:scale-x-100",
                  )}
                />
              </span>

              <span className="flex items-center gap-(--space-sm)">
                {isCustom ? (
                  /* Palette chip — deliberately NOT a product photo, so the
                   * custom option can never duplicate a standard swatch and
                   * reads instantly as "any RAL/NCS colour". */
                  <span
                    aria-hidden="true"
                    className="border-drawing-line-subtle block h-14 w-14 shrink-0 border"
                    style={{
                      background:
                        "conic-gradient(from 90deg, #d98c8c, #d9c48c, #a9d98c, #8cb8d9, #b08cd9, #d98c8c)",
                    }}
                  />
                ) : (
                  <span className="bg-surface-muted border-drawing-line-subtle relative block h-14 w-14 shrink-0 overflow-hidden border">
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
                )}

                <span className="flex min-w-0 flex-col gap-(--space-3xs)">
                  <span className="type-body-sm text-text">
                    {isCustom ? t.colourCustomOptionTitle : choice.label}
                  </span>
                  <ColourPriceNote
                    choice={choice}
                    locale={locale}
                    noSurchargeLabel={t.colourNoSurcharge}
                  />
                  {isCustom ? (
                    <span className="type-caption text-text-muted">
                      {t.colourCustomNote}
                    </span>
                  ) : null}
                </span>
              </span>
            </button>
          );
        })}
      </div>
    </section>
  );
}

/**
 * The one line on the plate that has to be unambiguous before anyone clicks:
 * what this choice does to the price. A real surcharge is shown as a real
 * figure; no surcharge is stated outright rather than left blank, because a
 * blank reads as "unknown" on the option whose whole reputation problem is
 * being priced on application. Custom colours that genuinely have no fixed
 * surcharge fall through to the RAL/NCS note, which says so in words.
 */
function ColourPriceNote({
  choice,
  locale,
  noSurchargeLabel,
}: {
  choice: VariantChoice;
  locale: Locale;
  noSurchargeLabel: string;
}): ReactNode {
  if (choice.surcharge > 0) {
    return (
      <span className="type-technical-value text-text flex items-baseline gap-(--space-3xs)">
        <span aria-hidden="true">+</span>
        <Price amount={choice.surcharge} locale={locale} />
      </span>
    );
  }
  if (choice.kind === "standard") {
    return (
      <span className="type-drawing-label text-drawing-text">
        {noSurchargeLabel}
      </span>
    );
  }
  return null;
}
