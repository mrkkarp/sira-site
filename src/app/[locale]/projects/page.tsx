import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { isLocale } from "@/i18n/config";
import { getDictionary } from "@/i18n/get-dictionary";
import { pageSeo } from "@/lib/seo/page-seo";
import { localeHref } from "@/lib/locale-href";
import { getProjectGroups, getPublishedProjects } from "@/content/projects";
import { BreadcrumbStructuredData } from "@/components/seo/breadcrumb-structured-data";
import { ProjectIndex } from "@/components/projects/project-index";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>;
}): Promise<Metadata> {
  const { locale } = await params;
  if (!isLocale(locale)) return {};
  const dictionary = await getDictionary(locale);
  const copy = dictionary.projectsPage;

  /**
   * Real content exists here now, so the route leaves `buildPlaceholderMetadata`
   * (which emits `noindex`) behind — the same move `/about` and `/designers`
   * made. The share image is the first project's cover rather than the generic
   * workshop card: this page's whole argument is "here is a finished site",
   * and the photograph makes it before the title is read.
   *
   * `getPublishedProjects()` and not `getProjectGroups()[0]` deliberately: the
   * groups exist to order the *page*, and the first group may legitimately be
   * empty one day, which would leave the share card with no photograph at all.
   * The flat list is guaranteed non-empty by `projects.test.ts`.
   */
  const [firstProject] = getPublishedProjects();

  return {
    title: dictionary.pages.projects,
    description: copy.seoDescription,
    ...pageSeo({
      locale,
      path: "/projects",
      title: `${copy.heading} — ${dictionary.site.name}`,
      description: copy.seoDescription,
      siteName: dictionary.site.name,
      image: firstProject?.images[0]?.src,
    }),
  };
}

export default async function Page({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  if (!isLocale(locale)) notFound();
  const dictionary = await getDictionary(locale);
  const groups = getProjectGroups();

  return (
    <>
      <BreadcrumbStructuredData
        items={[
          {
            name: dictionary.shop.breadcrumbHome,
            path: localeHref(locale, "/"),
          },
          {
            name: dictionary.projectsPage.heading,
            path: localeHref(locale, "/projects"),
          },
        ]}
      />
      <ProjectIndex locale={locale} dictionary={dictionary} groups={groups} />
    </>
  );
}
