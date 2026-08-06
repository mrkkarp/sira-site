"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import dynamic from "next/dynamic";
import { useRouter } from "next/navigation";
import type { Locale } from "@/i18n/config";
import type { Dictionary } from "@/i18n/get-dictionary";
import type { Product } from "@/lib/schemas/product";
import {
  buildVariantModel,
  resolveVariant,
  type VariantSelection,
} from "@/lib/variant-model";
import { buildVariantHref } from "@/lib/variant-url";
import { buildGalleryMedia } from "@/lib/gallery-media";
import { buildQuoteContext } from "@/lib/quote-context";
import { formatTemplate } from "@/lib/format-template";
import { useCookieBannerUndecided } from "@/lib/use-cookie-banner";
import { ProductGallery } from "@/components/product/product-gallery";
import { ProductCoreInfo } from "@/components/product/product-core-info";
import { ProductTrustDetails } from "@/components/product/product-trust-details";
import { ColourSelector } from "@/components/product/colour-selector";
import { AddToCartButton } from "@/components/product/add-to-cart-button";
import { MobileStickyCta } from "@/components/product/mobile-sticky-cta";
import { Button } from "@/components/ui/button";

/**
 * The consultation form is revealed only when a shopper picks a custom colour
 * *and* then clicks the CTA, so a static import made every visitor to every
 * product page download it — and, because it validates the phone number in the
 * browser, zod's whole runtime with it: ~277 kB uncompressed, for a form most
 * visitors never open. This is the case `lazy-loading.md` names outright
 * ("defer loading a modal until a user clicks to open it").
 *
 * `preloadQuoteForm` is the other half. A code split trades bytes for a delay
 * at the moment of the click, which is the worst moment to add one; calling the
 * same `import()` on hover/focus starts the fetch while the pointer is still
 * travelling, so the chunk is usually in the module cache before the click
 * lands. It is the identical specifier, so the bundler resolves both to one
 * chunk and a second call is a no-op.
 */
const QuoteRequestForm = dynamic(() =>
  import("@/components/product/quote-request-form").then(
    (module) => module.QuoteRequestForm,
  ),
);

const preloadQuoteForm = () => {
  void import("@/components/product/quote-request-form");
};

/**
 * Product page's single interactive "island" (Prompt 6 §1/§4/§5/§6/§14) —
 * owns the live variant selection so the gallery (photo swaps on colour
 * change) and the configurator/CTA panel always agree on the same resolved
 * variant. Everything else on the product page (description, specs
 * accordion, editorial, related products) is static per-product data that
 * doesn't depend on the current selection, so it's rendered separately by
 * the page itself.
 *
 * Desktop layout: ~60/40 gallery/info split, right column sticky and sized by
 * its content — everything from the price to the CTA is on screen at once,
 * with no scrollbar of its own (see the note at the column itself). Mobile:
 * stacked, plus a sticky bottom CTA bar once the shopper scrolls past the
 * main CTA.
 */
export function ProductExperience({
  product,
  dictionary,
  locale,
  basePath,
  initialSelection,
  brokenImageLabel,
}: {
  product: Product;
  dictionary: Dictionary;
  locale: Locale;
  /**
   * The product's own path, no query string — built by `localeHref`, which
   * omits the prefix for the default locale. So it is "/products/odri" for uk
   * and "/en/products/odri" for en; "/uk/..." is not a route and 404s.
   */
  basePath: string;
  initialSelection: VariantSelection;
  brokenImageLabel: string;
}) {
  const router = useRouter();
  const model = useMemo(() => buildVariantModel(product), [product]);
  const [selection, setSelection] =
    useState<VariantSelection>(initialSelection);
  const resolved = useMemo(
    () => resolveVariant(model, selection),
    [model, selection],
  );
  const variant = resolved.variant ?? product.base;
  const media = useMemo(
    () => buildGalleryMedia(product, variant),
    [product, variant],
  );

  const colourOption = model.options.find((option) => option.id === "colour");
  const colourChoices = colourOption?.choices ?? [];
  const resolvedColourChoice = colourChoices.find(
    (choice) => choice.id === resolved.selection.colour,
  );
  const customChoice = colourChoices.find((choice) => choice.kind === "custom");

  // Custom colours route to a consultation CTA (not a modal) instead of the
  // direct add-to-cart flow. Driven entirely by the resolved choice's data
  // flag so it's universal — a custom colourway an admin marks as directly
  // orderable simply reports `contactRequired: false` and buys normally.
  const contactRequired = resolvedColourChoice?.contactRequired ?? false;

  // Each colour keeps showing its own full price (as before the redesign):
  // a "від"/"from" floor while a standard colour is displayed but a custom
  // colour also exists, otherwise the plain price of the selected colour.
  // No surcharge breakdown — the price shown is always the real variant price.
  const priceDisplay: { type: "fixed" | "from"; amount: number } = (() => {
    const showingStandard =
      !resolvedColourChoice || resolvedColourChoice.kind === "standard";
    if (showingStandard && customChoice) {
      return { type: "from", amount: variant.price };
    }
    return { type: "fixed", amount: variant.price };
  })();

  const [showQuoteForm, setShowQuoteForm] = useState(false);

  function handleSelect(optionId: string, choiceId: string) {
    const next = { ...selection, [optionId]: choiceId };
    setSelection(next);
    router.push(buildVariantHref(basePath, next), { scroll: false });
  }

  function revealQuoteForm() {
    setShowQuoteForm(true);
    quoteFormRef.current?.scrollIntoView({
      behavior: "smooth",
      block: "center",
    });
  }

  const ctaSentinelRef = useRef<HTMLDivElement>(null);
  const quoteFormRef = useRef<HTMLDivElement>(null);
  const [pastCta, setPastCta] = useState(false);

  useEffect(() => {
    const sentinel = ctaSentinelRef.current;
    if (!sentinel) return;
    const observer = new IntersectionObserver(
      ([entry]) => setPastCta(!entry.isIntersecting),
      {
        threshold: 0,
      },
    );
    observer.observe(sentinel);
    return () => observer.disconnect();
  }, []);

  // Yields the bottom edge to the cookie banner, which sits above it at z-45.
  // (The local subscription this replaced listened to `storage` only, which
  // never fires in the tab that made the change, so the sticky CTA stayed
  // hidden after accepting cookies until the visitor reloaded.)
  const cookieBannerUndecided = useCookieBannerUndecided();

  return (
    // The gallery column was a flat `3fr`, which on a 1440×751 laptop made it
    // 755 px wide — and a square photo 755 px wide is 755 px tall, taller than
    // the viewport. Capping the photo alone would have left a few hundred
    // pixels of dead space beside it, so the cap lives on the *column*:
    // `min(60%, <height budget>)`. On a tall screen 60% wins and the split is
    // the old 3fr/2fr; on a short one the height budget wins, the gallery
    // narrows, and the info column absorbs the difference instead of the
    // layout growing a hole. (`ProductGallery` carries the same expression as
    // its own max-width, which is what caps it on phones in landscape, where
    // there is no grid at all.)
    <div className="lg:grid lg:grid-cols-[minmax(0,min(60%,calc(100svh-var(--header-stack-height,74px)-9rem)))_minmax(0,1fr)] lg:items-start lg:gap-x-(--space-lg)">
      <div>
        <ProductGallery
          media={media}
          brokenImageLabel={brokenImageLabel}
          dictionary={dictionary}
        />
      </div>

      {/* No scrollbar of its own. The panel used to be capped at the viewport
          height with `overflow-y-auto`, which put a second scrollbar beside the
          page's: the price and the colours were visible, the "add to cart"
          button was below the fold *of a box*, and scrolling the page did not
          bring it up — the shopper had to notice the panel scrolls separately
          and scroll inside it. Nothing on the buying path may be reachable only
          by that discovery.

          Instead the panel is short enough to fit — the colour plates now sit
          two-up, which is where the height went. It stays `sticky` so it holds
          its place while the photo column scrolls; if a longer piece ever does
          outgrow the viewport (a two-line name, a third colourway, or the quote
          form opening inline), `sticky` simply stops pinning and the block
          scrolls with the page like any other. Overflow that becomes ordinary
          page scroll is a non-event; overflow hidden inside a fixed-height box
          is a lost sale. */}
      <div className="mt-(--space-md) flex flex-col gap-(--space-sm) lg:sticky lg:top-(--header-stack-height) lg:mt-0 lg:pb-(--space-md)">
        <ProductCoreInfo
          product={product}
          variant={variant}
          priceDisplay={priceDisplay}
          locale={locale}
          dictionary={dictionary}
        />

        {colourOption ? (
          <ColourSelector
            choices={colourOption.choices}
            selectedId={resolved.selection.colour}
            onSelect={(choiceId) => handleSelect("colour", choiceId)}
            dictionary={dictionary}
            locale={locale}
            brokenImageLabel={brokenImageLabel}
          />
        ) : null}

        {!resolved.isComplete ? (
          <p role="alert" className="type-body-sm text-error">
            {formatTemplate(dictionary.product.selectOptionsPrompt, {
              options: resolved.missingOptionIds
                .map((id) =>
                  id === "colour" ? dictionary.product.colourLabel : id,
                )
                .join(", "),
            })}
          </p>
        ) : null}

        <div ref={ctaSentinelRef}>
          {resolved.isComplete && resolved.variant ? (
            contactRequired ? (
              // §4/§5: a calm, embedded consultation CTA — never an
              // auto-appearing modal/popup. The lead form is revealed inline
              // only on an explicit click (progressive disclosure).
              <div
                ref={quoteFormRef}
                className="flex flex-col gap-(--space-2xs)"
              >
                <p className="type-body-sm text-text-muted">
                  {dictionary.product.contactColourIntro}
                </p>
                {showQuoteForm ? (
                  <QuoteRequestForm
                    dictionary={dictionary}
                    context={buildQuoteContext(product, resolved.variant)}
                    product={product}
                    variant={resolved.variant}
                  />
                ) : (
                  <Button
                    type="button"
                    variant="primary-dark"
                    className="self-start"
                    onPointerEnter={preloadQuoteForm}
                    onFocus={preloadQuoteForm}
                    onClick={() => setShowQuoteForm(true)}
                  >
                    {dictionary.product.contactColourCta}
                  </Button>
                )}
              </div>
            ) : (
              <AddToCartButton
                product={product}
                variant={resolved.variant}
                dictionary={dictionary}
              />
            )
          ) : null}
        </div>

        <ProductTrustDetails
          hasColourMatching={Boolean(product.customColour)}
          dictionary={dictionary}
        />
      </div>

      <MobileStickyCta
        visible={pastCta}
        hideForCookieBanner={cookieBannerUndecided}
        product={product}
        variant={resolved.isComplete ? resolved.variant : undefined}
        contactRequired={contactRequired}
        onRequestQuote={revealQuoteForm}
        dictionary={dictionary}
        locale={locale}
      />
    </div>
  );
}
