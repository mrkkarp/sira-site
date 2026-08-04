import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { isLocale } from "@/i18n/config";
import { getDictionary } from "@/i18n/get-dictionary";
import { localeHref } from "@/lib/locale-href";
import { pageSeo } from "@/lib/seo/page-seo";
import { getCollectionBySlug, getCollectionProducts } from "@/lib/collections";
import { preloadProducts } from "@/lib/products";
import { getAllProductColours } from "@/lib/product-colours";
import { shopCategoryLabel } from "@/lib/shop-category-label";
import { shopCategoryPath } from "@/lib/schemas/product";
import { Container, Section, EditorialLayout } from "@/components/layout";
import { MediaFrame } from "@/components/layout/media-frame";
import { ProductImage } from "@/components/product/product-image";
import { ProductGrid } from "@/components/shop/product-grid";
import { Breadcrumbs } from "@/components/ui/breadcrumbs";
import { BreadcrumbStructuredData } from "@/components/seo/breadcrumb-structured-data";
import { CollectionStructuredData } from "@/components/seo/collection-structured-data";
import { EmptyState } from "@/components/ui/empty-state";
import { TextLink } from "@/components/ui/text-link";
import { LinkButton } from "@/components/ui/link-button";
import { Swatch } from "@/components/ui/swatch";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string; slug: string }>;
}): Promise<Metadata> {
  const { locale, slug } = await params;
  if (!isLocale(locale)) return {};
  const dictionary = await getDictionary(locale);
  const collection = getCollectionBySlug(slug);
  if (!collection) return { title: dictionary.collectionsPage.notFoundHeading };

  // A collection has no cover image of its own — it is a grouping of real
  // products (see `src/lib/collections.ts`), so its first member's photo is
  // the honest illustration of it rather than a picture invented for the card.
  await preloadProducts(locale);
  const [firstProduct] = getCollectionProducts(collection);

  return {
    title: collection.name,
    description: collection.description,
    ...pageSeo({
      locale,
      path: `/collections/${collection.slug}`,
      title: collection.name,
      description: collection.description,
      siteName: dictionary.site.name,
      image: firstProduct?.base.photo,
    }),
  };
}

/**
 * `/collections/[slug]` (Prompt 5 §13) — a real editorial landing page, not
 * "just a filtered grid": hero photo, real story copy from
 * `collections.json`'s `description`, the curated product grid, a second
 * editorial break using one of the collection's own real product photos
 * (no stock/invented imagery — see IMAGE_REQUIREMENTS.md), a "related
 * colours" section built from genuinely `availableCategories`-matched
 * entries in `product-colours.json`, and links out to `/projects` and the
 * full catalog.
 *
 * An unknown slug does NOT throw the framework `notFound()` (this project's
 * `notFound()` has a pre-existing quirk — see `/[category]` — of
 * rendering the right content but a 200 status). Instead it renders the
 * same honest, non-blank "not found" state pattern used by `ShopEmptyState`,
 * using the dedicated `collectionsPage.notFoundHeading/notFoundBody` copy
 * (deliberately distinct from the sitewide `notFoundPage` 404 strings).
 */
export default async function CollectionPage({
  params,
}: {
  params: Promise<{ locale: string; slug: string }>;
}) {
  const { locale, slug } = await params;
  if (!isLocale(locale)) notFound();
  const dictionary = await getDictionary(locale);
  const collection = getCollectionBySlug(slug);
  const copy = dictionary.collectionsPage;

  const crumbs = [
    { label: dictionary.shop.breadcrumbHome, href: localeHref(locale, "/") },
    {
      label: dictionary.pages.collections,
      href: localeHref(locale, "/collections"),
    },
  ];

  if (!collection) {
    return (
      <Section spacing="lg">
        <Container className="flex flex-col gap-(--space-lg)">
          <Breadcrumbs items={[...crumbs, { label: copy.notFoundHeading }]} />
          <EmptyState
            heading={copy.notFoundHeading}
            description={copy.notFoundBody}
            action={
              <div className="flex flex-wrap justify-center gap-(--space-sm)">
                <TextLink
                  href={localeHref(locale, "/collections")}
                  variant="underlined"
                >
                  {dictionary.pages.collections}
                </TextLink>
                <TextLink
                  href={localeHref(locale, "/shop")}
                  variant="underlined"
                >
                  {copy.backToShopCta}
                </TextLink>
              </div>
            }
          />
        </Container>
      </Section>
    );
  }

  await preloadProducts(locale);
  const products = getCollectionProducts(collection);
  const categoriesInCollection = Array.from(
    new Set(products.map((product) => product.shopCategory)),
  );
  const relatedColours = getAllProductColours().filter((colour) =>
    colour.availableCategories.some((category) =>
      categoriesInCollection.includes(category),
    ),
  );
  // A second, distinct real photo for the editorial break — reuses one of
  // the collection's own curated products rather than inventing new
  // photography. Picking the middle item keeps it visually distinct from
  // the hero (`coverPhoto`) and the grid's first row.
  const editorialProduct = products[Math.floor(products.length / 2)];
  const collectionPath = localeHref(locale, `/collections/${collection.slug}`);

  return (
    <>
      <Section spacing="lg">
        <Container className="flex flex-col gap-(--space-lg)">
          <BreadcrumbStructuredData
            items={[
              {
                name: dictionary.shop.breadcrumbHome,
                path: localeHref(locale, "/"),
              },
              {
                name: dictionary.pages.collections,
                path: localeHref(locale, "/collections"),
              },
              { name: collection.name, path: collectionPath },
            ]}
          />
          {products.length > 0 ? (
            <CollectionStructuredData
              name={collection.name}
              description={collection.description}
              path={collectionPath}
              items={products.map((product) => ({
                name: product.name,
                path: localeHref(locale, `/products/${product.slug}`),
              }))}
            />
          ) : null}
          <Breadcrumbs items={[...crumbs, { label: collection.name }]} />

          {/* This was a full-bleed 21:9 band, which on a 1440 px screen meant
              a 1360×583 frame — and 21:9 filled from a 7:8 product photograph
              is a 78 % crop, i.e. a thin horizontal strip through the middle
              of a washbasin presented as a collection hero. There is no
              cinematic collection photography in the source; there is one
              product photograph. So it is shown as what it is: a square plate,
              capped by viewport height and set above the title, rather than a
              panorama we do not have. */}
          <MediaFrame
            ratio="square"
            maxViewportHeight="52svh"
            className="w-full"
          >
            <ProductImage
              src={collection.coverPhoto}
              alt={collection.name}
              priority
              sizes="(min-width: 1024px) 40vw, 100vw"
              brokenLabel={dictionary.shop.states.brokenImageAlt}
            />
          </MediaFrame>

          <div className="flex max-w-2xl flex-col gap-(--space-2xs)">
            <p className="type-eyebrow text-text-muted">{copy.demoLabel}</p>
            <h1 className="type-h1 text-text">{collection.name}</h1>
            <p className="type-body text-text-muted">
              {collection.description}
            </p>
          </div>
        </Container>
      </Section>

      {products.length > 0 ? (
        <Section spacing="lg">
          <Container>
            {/* Visually hidden, but a real level-2 heading. `ProductCard`
                renders `h3`, so this section jumped straight from the
                collection's `h1` to `h3` and someone navigating by heading
                had nothing marking where the products begin. `shop-catalog`
                already carries the same marker for the same reason. */}
            <h2 className="sr-only">{dictionary.shop.gridHeading}</h2>
            <ProductGrid
              products={products}
              locale={locale}
              dictionary={dictionary}
            />
          </Container>
        </Section>
      ) : null}

      {editorialProduct ? (
        <Section spacing="lg">
          <Container>
            <EditorialLayout
              media={
                /* Same reasoning as `ProductEditorial`: a portrait frame that
                   does not crop, capped by viewport height rather than by the
                   width of the column it happens to sit in. */
                <MediaFrame
                  ratio="editorial-portrait"
                  fit="contain"
                  maxViewportHeight="58svh"
                >
                  <ProductImage
                    src={
                      (editorialProduct.customColour ?? editorialProduct.base)
                        .photo
                    }
                    alt={`ODUDLAB ${editorialProduct.name}`}
                    sizes="(min-width: 1024px) 33vw, 100vw"
                    brokenLabel={dictionary.shop.states.brokenImageAlt}
                  />
                </MediaFrame>
              }
            >
              <p className="type-eyebrow text-text-muted">
                {shopCategoryLabel(editorialProduct.shopCategory, dictionary)}
              </p>
              <h2 className="type-h2 text-text mt-(--space-xs)">
                {editorialProduct.name}
              </h2>
              <div className="mt-(--space-sm)">
                <LinkButton
                  href={localeHref(
                    locale,
                    shopCategoryPath(editorialProduct.shopCategory),
                  )}
                  variant="outline"
                >
                  {copy.viewProductsCta}
                </LinkButton>
              </div>
            </EditorialLayout>
          </Container>
        </Section>
      ) : null}

      {relatedColours.length > 0 ? (
        <Section spacing="lg">
          <Container className="flex flex-col gap-(--space-md)">
            <h2 className="type-h2 text-text">{copy.relatedColoursHeading}</h2>
            <div className="flex flex-wrap gap-(--space-md)">
              {relatedColours.map((colour) => (
                <div
                  key={colour.slug}
                  className="flex flex-col items-center gap-(--space-3xs)"
                >
                  <Swatch colour={colour} size="md" />
                  <p className="type-caption text-text-muted">
                    {colour.displayName}
                  </p>
                </div>
              ))}
            </div>
          </Container>
        </Section>
      ) : null}

      <Section spacing="lg">
        <Container className="flex flex-wrap gap-(--space-md)">
          <TextLink href={localeHref(locale, "/projects")} variant="underlined">
            {copy.projectsLinkCta}
          </TextLink>
          <TextLink href={localeHref(locale, "/shop")} variant="underlined">
            {copy.backToShopCta}
          </TextLink>
        </Container>
      </Section>
    </>
  );
}
