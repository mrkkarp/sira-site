import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { isLocale, locales } from "@/i18n/config";
import { getDictionary } from "@/i18n/get-dictionary";
import { localeHref } from "@/lib/locale-href";
import { pageSeo } from "@/lib/seo/page-seo";
import { missingEntityMetadata } from "@/lib/seo/indexing";
import {
  getAllProductsAsync,
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

/**
 * Every published product, in every locale — which is what turns this route
 * from `ƒ` into `●` in the build output.
 *
 * It was dynamic before, and the cost was not theoretical: `x-vercel-cache`
 * was `MISS` on every single product view, forever, because a route that reads
 * the query string is one Vercel is not allowed to cache. Measured from a
 * European edge that was ~330 ms TTFB against ~135 ms for something the CDN
 * can answer itself — a transatlantic round trip to the function region in
 * `iad1` on every visit, plus a cold start on the first.
 *
 * The slug is not a localized field in Payload (see `Products.ts`), so one
 * slug list crosses with the locale list rather than being re-read per locale.
 *
 * `dynamicParams` is left at its default (`true`) on purpose: the owner adds
 * products in the admin, and those must render on first request instead of
 * 404ing until the next deploy. They generate on demand and are then cached
 * like the rest — the `loading.tsx` beside this file is what that first
 * visitor sees.
 */
export async function generateStaticParams() {
  const products = await getAllProductsAsync();
  return locales.flatMap((locale) =>
    products.map((product) => ({ locale, slug: product.slug })),
  );
}

export async function generateMetadata({
  params,
}: {
  params: Promise<PageParams>;
}): Promise<Metadata> {
  const { locale, slug } = await params;
  if (!isLocale(locale)) return {};
  await preloadProducts(locale);
  const product = getProductBySlug(slug);
  // The page below calls `notFound()` for this slug. It cannot answer with a
  // 404 *status* — `loading.tsx` has already flushed by then — so the one
  // thing that keeps the URL out of the index is this. See
  // `missingEntityMetadata`.
  if (!product) return missingEntityMetadata;

  const dictionary = await getDictionary(locale);

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
      // The base variant's photo, for every share of this product.
      //
      // It used to be the photo of the *resolved* variant, so that a link
      // shared from a `?colour=…` URL previewed the colour the sharer was
      // looking at. That is a nicer share card, and it cost a query-string read
      // in `generateMetadata` — which is enough on its own to make the whole
      // route dynamic, for every visitor, whether or not they arrived with a
      // query string. A per-colour preview image is not worth a transatlantic
      // round trip on every product view.
      image: product.base.photo,
    }),
  };
}

/**
 * `/products/[slug]` — the universal product page (Prompt 6). Assembles:
 * breadcrumbs; `ProductExperience` (the gallery+configurator+CTA "island");
 * the structured description; the details accordion; the editorial sections;
 * the related-products rail; and the Product JSON-LD.
 *
 * Prerendered — see `generateStaticParams`. Nothing here may read the query
 * string, so the page always renders the product's default variant and §5's
 * "restore after refresh" for a shared `?colour=…` link happens in the browser
 * instead (`ProductExperience`). The rendered output is unchanged for everyone
 * arriving without a query string, which is nearly everyone.
 *
 * An unknown slug 404s via `notFound()`, matching `/[category]`'s
 * existing convention for an invalid dynamic segment.
 */
export default async function ProductPage({
  params,
}: {
  params: Promise<PageParams>;
}) {
  const { locale, slug } = await params;
  if (!isLocale(locale)) notFound();
  await preloadProducts(locale);
  const product = getProductBySlug(slug);
  if (!product) notFound();

  const dictionary = await getDictionary(locale);

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
        variant={product.base}
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
