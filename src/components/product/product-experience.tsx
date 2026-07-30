"use client";

import {
  useEffect,
  useMemo,
  useRef,
  useState,
  useSyncExternalStore,
} from "react";
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
import { readConsent } from "@/lib/cookie-consent";
import { ProductGallery } from "@/components/product/product-gallery";
import { ProductCoreInfo } from "@/components/product/product-core-info";
import { ProductTrustDetails } from "@/components/product/product-trust-details";
import { ColourSelector } from "@/components/product/colour-selector";
import { AddToCartButton } from "@/components/product/add-to-cart-button";
import { QuoteRequestForm } from "@/components/product/quote-request-form";
import { MobileStickyCta } from "@/components/product/mobile-sticky-cta";

function subscribeToConsentDecision(onChange: () => void) {
  window.addEventListener("storage", onChange);
  return () => window.removeEventListener("storage", onChange);
}

/**
 * Product page's single interactive "island" (Prompt 6 §1/§4/§5/§6/§14) —
 * owns the live variant selection so the gallery (photo swaps on colour
 * change) and the configurator/CTA panel always agree on the same resolved
 * variant. Everything else on the product page (description, specs
 * accordion, editorial, related products) is static per-product data that
 * doesn't depend on the current selection, so it's rendered separately by
 * the page itself.
 *
 * Desktop layout: ~60/40 gallery/info split, right column sticky but capped
 * to the viewport height so it never overlaps the footer (same technique
 * as `DesktopFilterSidebar`). Mobile: stacked, plus a sticky bottom CTA bar
 * once the shopper scrolls past the main CTA.
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
  /** Locale-prefixed path with no query string, e.g. "/uk/products/odri". */
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

  const isCustomColour =
    Boolean(product.customColour) && resolved.variant === product.customColour;
  const showFromPrefix = Boolean(product.customColour) && !isCustomColour;
  const colourOption = model.options.find((option) => option.id === "colour");

  function handleSelect(optionId: string, choiceId: string) {
    const next = { ...selection, [optionId]: choiceId };
    setSelection(next);
    router.push(buildVariantHref(basePath, next), { scroll: false });
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

  const cookieBannerUndecided = useSyncExternalStore(
    subscribeToConsentDecision,
    () => readConsent() === null,
    () => false,
  );

  return (
    <div className="lg:grid lg:grid-cols-[3fr_2fr] lg:items-start lg:gap-x-(--space-lg)">
      <div>
        <ProductGallery
          media={media}
          brokenImageLabel={brokenImageLabel}
          dictionary={dictionary}
        />
      </div>

      <div className="mt-(--space-md) flex flex-col gap-(--space-sm) lg:sticky lg:top-(--header-stack-height) lg:mt-0 lg:max-h-[calc(100svh-var(--header-stack-height)-var(--space-lg))] lg:overflow-y-auto lg:pb-(--space-lg)">
        <ProductCoreInfo
          product={product}
          variant={variant}
          showFromPrefix={showFromPrefix}
          locale={locale}
          dictionary={dictionary}
        />

        {colourOption ? (
          <ColourSelector
            choices={colourOption.choices}
            selectedId={resolved.selection.colour}
            onSelect={(choiceId) => handleSelect("colour", choiceId)}
            dictionary={dictionary}
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
            isCustomColour ? (
              <div ref={quoteFormRef}>
                <QuoteRequestForm
                  dictionary={dictionary}
                  context={buildQuoteContext(product, resolved.variant)}
                  productId={product.slug}
                  variantId={resolved.variant.sku}
                />
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
        isCustomColour={isCustomColour}
        onRequestQuote={() =>
          quoteFormRef.current?.scrollIntoView({
            behavior: "smooth",
            block: "center",
          })
        }
        dictionary={dictionary}
        locale={locale}
      />
    </div>
  );
}
