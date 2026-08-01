import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { isLocale } from "@/i18n/config";
import { getDictionary } from "@/i18n/get-dictionary";
import { indexableLocales } from "@/lib/seo/indexing";
import { localeHref } from "@/lib/locale-href";
import { getSiteUrl } from "@/lib/site-url";
import { getAllCollections } from "@/lib/collections";
import { Container, Section, Grid } from "@/components/layout";
import { MediaFrame } from "@/components/layout/media-frame";
import { ProductImage } from "@/components/product/product-image";
import { Breadcrumbs } from "@/components/ui/breadcrumbs";
import { BreadcrumbStructuredData } from "@/components/seo/breadcrumb-structured-data";
import { CollectionStructuredData } from "@/components/seo/collection-structured-data";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>;
}): Promise<Metadata> {
  const { locale } = await params;
  if (!isLocale(locale)) return {};
  const dictionary = await getDictionary(locale);
  const siteUrl = getSiteUrl();
  const canonicalPath = localeHref(locale, "/collections");

  return {
    title: dictionary.collectionsPage.heading,
    description: dictionary.collectionsPage.intro,
    alternates: {
      canonical: canonicalPath,
      languages: Object.fromEntries(
        indexableLocales.map((altLocale) => [
          altLocale,
          localeHref(altLocale, "/collections"),
        ]),
      ),
    },
    openGraph: {
      title: dictionary.collectionsPage.heading,
      description: dictionary.collectionsPage.intro,
      url: new URL(canonicalPath, siteUrl).toString(),
      siteName: dictionary.site.name,
      locale,
      type: "website",
    },
  };
}

/** `/collections` — lists the real curated collections from
 * `collections.json`, each linking to its own `/collections/[slug]`
 * editorial landing page (Prompt 5 §13). */
export default async function CollectionsPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  if (!isLocale(locale)) notFound();
  const dictionary = await getDictionary(locale);
  const copy = dictionary.collectionsPage;
  const collections = getAllCollections();

  const canonicalPath = localeHref(locale, "/collections");

  return (
    <Section spacing="lg">
      <Container className="flex flex-col gap-(--space-lg)">
        <BreadcrumbStructuredData
          items={[
            {
              name: dictionary.shop.breadcrumbHome,
              path: localeHref(locale, "/"),
            },
            { name: copy.heading, path: canonicalPath },
          ]}
        />
        <CollectionStructuredData
          name={copy.heading}
          description={copy.intro}
          path={canonicalPath}
          items={collections.map((collection) => ({
            name: collection.name,
            path: localeHref(locale, `/collections/${collection.slug}`),
          }))}
        />
        <div className="flex flex-col gap-(--space-md)">
          <Breadcrumbs
            items={[
              {
                label: dictionary.shop.breadcrumbHome,
                href: localeHref(locale, "/"),
              },
              { label: copy.heading },
            ]}
          />
          <div className="flex flex-col gap-(--space-2xs)">
            <h1 className="type-h1 text-text">{copy.heading}</h1>
            <p className="type-body text-text-muted max-w-2xl">{copy.intro}</p>
            <p className="type-caption text-text-muted">{copy.demoLabel}</p>
          </div>
        </div>

        <Grid>
          {collections.map((collection) => (
            <Link
              key={collection.slug}
              href={localeHref(locale, `/collections/${collection.slug}`)}
              className="group col-span-4 flex flex-col gap-(--space-xs) focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-(--color-focus)"
            >
              <MediaFrame ratio="editorial-landscape">
                <ProductImage
                  src={collection.coverPhoto}
                  alt={collection.name}
                  sizes="(min-width: 1024px) 33vw, (min-width: 768px) 50vw, 100vw"
                  className="transition-transform duration-(--duration-normal) ease-(--ease-standard) group-hover:scale-[1.03]"
                  brokenLabel={dictionary.shop.states.brokenImageAlt}
                />
              </MediaFrame>
              <div className="flex flex-col gap-(--space-3xs)">
                <h2 className="type-h4 text-text">{collection.name}</h2>
                <p className="type-body-sm text-text-muted line-clamp-2">
                  {collection.description}
                </p>
                <span className="type-nav text-text mt-(--space-3xs) underline decoration-1 underline-offset-4">
                  {copy.viewProductsCta}
                </span>
              </div>
            </Link>
          ))}
        </Grid>
      </Container>
    </Section>
  );
}
