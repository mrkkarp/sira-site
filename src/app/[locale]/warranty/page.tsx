import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { isLocale } from "@/i18n/config";
import { getDictionary } from "@/i18n/get-dictionary";
import { localeHref } from "@/lib/locale-href";
import { pageSeo } from "@/lib/seo/page-seo";
import { Container, Section } from "@/components/layout";
import { Breadcrumbs } from "@/components/ui/breadcrumbs";
import { WarrantyRequestForm } from "@/components/forms/warranty-request-form";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>;
}): Promise<Metadata> {
  const { locale } = await params;
  if (!isLocale(locale)) return {};
  const dictionary = await getDictionary(locale);

  // `/warranty` is indexable and listed in `sitemap.ts`, so it needs the same
  // share card and hreflang cluster as every other indexable route. It was the
  // one that got missed when `pageSeo()` replaced the hand-written
  // `alternates`/`openGraph` blocks — it had neither an `openGraph` of its own
  // nor a parent one to inherit (the locale layout sets none), which made it
  // the last page on the site that pasted into a chat as a bare line of text.
  return {
    title: dictionary.warranty.title,
    description: dictionary.warranty.intro,
    ...pageSeo({
      locale,
      path: "/warranty",
      title: `${dictionary.warranty.title} — ${dictionary.site.name}`,
      description: dictionary.warranty.intro,
      siteName: dictionary.site.name,
    }),
  };
}

/** `/warranty` — post-purchase warranty claim form (Phase I). Replaces
 * the `PlaceholderPage` stub now that a real submission flow exists:
 * `WarrantyRequestForm` posts a `type: "warranty"` lead (with any
 * uploaded photo ids) to `/api/warranty`, per `WarrantyRequestSchema`. */
export default async function WarrantyPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  if (!isLocale(locale)) notFound();
  const dictionary = await getDictionary(locale);

  return (
    <Section spacing="lg">
      <Container className="flex flex-col gap-(--space-lg)">
        <div className="mx-auto flex w-full max-w-2xl flex-col gap-(--space-2xs)">
          <Breadcrumbs
            items={[
              {
                label: dictionary.shop.breadcrumbHome,
                href: localeHref(locale, "/"),
              },
              { label: dictionary.warranty.title },
            ]}
          />
          <h1 className="type-h1 text-text">{dictionary.warranty.title}</h1>
          <p className="type-body text-text-muted">
            {dictionary.warranty.intro}
          </p>
        </div>

        <div className="mx-auto w-full max-w-2xl">
          <WarrantyRequestForm dictionary={dictionary} />
        </div>
      </Container>
    </Section>
  );
}
