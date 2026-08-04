import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { isLocale } from "@/i18n/config";
import { getDictionary } from "@/i18n/get-dictionary";
import { localeHref } from "@/lib/locale-href";
import { pageSeo } from "@/lib/seo/page-seo";
import {
  getProductBySlug,
  getProductsByCategory,
  preloadProducts,
} from "@/lib/products";
import {
  getAllCollections,
  getCollectionProducts,
  getCollectionSlugsForProduct,
} from "@/lib/collections";
import { popularProductSlugs } from "@/config/homepage";
import { buildVariantModel, resolveVariant } from "@/lib/variant-model";
import { parseVariantSelectionFromSearchParams } from "@/lib/variant-url";
import { buildDescriptionSections } from "@/lib/product-description";
import { buildEditorialSections } from "@/lib/editorial-sections";
import { pickRelatedProducts } from "@/lib/related-products";
import { shopCategoryLabel } from "@/lib/shop-category-label";
import type { Product } from "@/lib/schemas/product";
import { shopCategoryPath } from "@/lib/schemas/product";
import { Container, Section } from "@/components/layout";
import { Breadcrumbs } from "@/components/ui/breadcrumbs";
import { BreadcrumbStructuredData } from "@/components/seo/breadcrumb-structured-data";
import { ProductExperience } from "@/components/product/product-experience";
import { ProductDescription } from "@/components/product/product-description";
import { ProductDetailsAccordion } from "@/components/product/product-details-accordion";
import { ProductEditorial } from "@/components/product/product-editorial";
import { ProductRelated } from "@/components/product/product-related";
import { ProductStructuredData } from "@/components/product/product-structured-data";

type PageParams = { locale: string; slug: string };
type PageSearchParams = Record<string, string | string[] | undefined>;

export async function generateMetadata({
  params,
  searchParams,
}: {
  params: Promise<PageParams>;
  searchParams: Promise<PageSearchParams>;
}): Promise<Metadata> {
  const { locale, slug } = await params;
  if (!isLocale(locale)) return {};
  await preloadProducts(locale);
  const product = getProductBySlug(slug);
  if (!product) return {};

  const dictionary = await getDictionary(locale);
  const model = buildVariantModel(product);
  const resolvedSearchParams = await searchParams;
  const initialSelection = parseVariantSelectionFromSearchParams(
    resolvedSearchParams,
    model.options.map((option) => option.id),
  );
  const resolved = resolveVariant(model, initialSelection);
  const variant = resolved.variant ?? product.base;

  const title = product.name;
  const [intro] = buildDescriptionSections(product.base.description);
  const description =
    intro?.text || shopCategoryLabel(product.shopCategory, dictionary);

  return {
    title,
    description,
    ...pageSeo({
      locale,
      path: `/products/${product.slug}`,
      title,
      description,
      siteName: dictionary.site.name,
      // The *resolved* variant's photo, not `product.base.photo`: a link shared
      // from a `?colour=…` URL should preview the colour the sharer was looking
      // at. This page was the only one that ever set an og image; `pageSeo`
      // now gives every other page a fallback (see `SHARE_CARD`).
      image: variant.photo,
    }),
  };
}

/**
 * `/products/[slug]` — the universal product page (Prompt 6). Assembles:
 * breadcrumbs; `ProductExperience` (the gallery+configurator+CTA "island",
 * initialised from the real URL-encoded variant selection so a refresh
 * restores the same variant server-side too — see §5's "restore after
 * refresh"); the structured description; the details accordion; the
 * editorial sections; the related-products rail; and the Product JSON-LD.
 *
 * An unknown slug 404s via `notFound()`, matching `/[category]`'s
 * existing convention for an invalid dynamic segment.
 */
export default async function ProductPage({
  params,
  searchParams,
}: {
  params: Promise<PageParams>;
  searchParams: Promise<PageSearchParams>;
}) {
  const { locale, slug } = await params;
  if (!isLocale(locale)) notFound();
  await preloadProducts(locale);
  const product = getProductBySlug(slug);
  if (!product) notFound();

  const dictionary = await getDictionary(locale);
  const resolvedSearchParams = await searchParams;

  const model = buildVariantModel(product);
  const initialSelection = parseVariantSelectionFromSearchParams(
    resolvedSearchParams,
    model.options.map((option) => option.id),
  );
  const resolved = resolveVariant(model, initialSelection);
  const seoVariant = resolved.variant ?? product.base;

  const basePath = localeHref(locale, `/products/${product.slug}`);
  const brokenImageLabel = dictionary.shop.states.brokenImageAlt;

  const descriptionSections = buildDescriptionSections(
    product.base.description,
  );
  const editorialSections = buildEditorialSections(product, dictionary);

  // Real candidate lists for each priority tier — see `related-products.ts`
  // for which of these are genuinely backed by real data.
  const collections = getAllCollections();
  const sameCollectionProducts = getCollectionSlugsForProduct(
    product.slug,
  ).flatMap((collectionSlug) => {
    const collection = collections.find(
      (candidate) => candidate.slug === collectionSlug,
    );
    return collection ? getCollectionProducts(collection) : [];
  });
  const sameCategoryProducts = getProductsByCategory(product.shopCategory);
  const bestsellers = popularProductSlugs
    .map((bestsellerSlug) => getProductBySlug(bestsellerSlug))
    .filter((candidate): candidate is Product => Boolean(candidate));
  const relatedSection = pickRelatedProducts({
    currentSlug: product.slug,
    sameCollection: sameCollectionProducts,
    sameCategory: sameCategoryProducts,
    bestsellers,
  });

  const crumbs = [
    { label: dictionary.shop.breadcrumbHome, href: localeHref(locale, "/") },
    {
      label: shopCategoryLabel(product.shopCategory, dictionary),
      href: localeHref(locale, shopCategoryPath(product.shopCategory)),
    },
    { label: product.name },
  ];

  return (
    <>
      <ProductStructuredData
        product={product}
        variant={seoVariant}
        locale={locale}
        dictionary={dictionary}
      />
      <BreadcrumbStructuredData
        items={[
          {
            name: dictionary.shop.breadcrumbHome,
            path: localeHref(locale, "/"),
          },
          {
            name: shopCategoryLabel(product.shopCategory, dictionary),
            path: localeHref(locale, shopCategoryPath(product.shopCategory)),
          },
          { name: product.name, path: basePath },
        ]}
      />

      <Section spacing="lg">
        <Container className="flex flex-col gap-(--space-lg)">
          <Breadcrumbs items={crumbs} />
          <ProductExperience
            product={product}
            dictionary={dictionary}
            locale={locale}
            basePath={basePath}
            initialSelection={initialSelection}
            brokenImageLabel={brokenImageLabel}
          />
        </Container>
      </Section>

      {descriptionSections.length > 0 ? (
        <Section spacing="lg">
          <Container className="max-w-3xl">
            <ProductDescription
              sections={descriptionSections}
              dictionary={dictionary}
            />
          </Container>
        </Section>
      ) : null}

      <Section spacing="lg">
        <Container className="max-w-3xl">
          <ProductDetailsAccordion product={product} dictionary={dictionary} />
        </Container>
      </Section>

      {editorialSections.length > 0 ? (
        <Section spacing="lg">
          <Container>
            <ProductEditorial
              sections={editorialSections}
              brokenImageLabel={brokenImageLabel}
            />
          </Container>
        </Section>
      ) : null}

      {relatedSection ? (
        <Section spacing="lg">
          <Container>
            <ProductRelated
              section={relatedSection}
              locale={locale}
              dictionary={dictionary}
            />
          </Container>
        </Section>
      ) : null}
    </>
  );
}
