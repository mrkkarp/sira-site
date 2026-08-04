import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { isLocale, locales } from "@/i18n/config";
import { getDictionary } from "@/i18n/get-dictionary";
import { pageSeo } from "@/lib/seo/page-seo";
import { localeHref } from "@/lib/locale-href";
import {
  getProjectBySlug,
  getProjectContent,
  getPublishedProjects,
  projectPath,
} from "@/content/projects";
import { BreadcrumbStructuredData } from "@/components/seo/breadcrumb-structured-data";
import { ProjectStructuredData } from "@/components/seo/project-structured-data";
import { ProjectDetail } from "@/components/projects/project-detail";

/**
 * Every project is a static record in `src/content/projects.ts` with its
 * photographs committed alongside it, so the whole set can be prerendered at
 * build time — there is no database read to defer and nothing that changes
 * between requests. `dynamicParams` stays at its default, so an unknown slug
 * is still rendered on demand and still reaches `notFound()` below: the route
 * must answer a real 404 for `/projects/anything-else` rather than a soft one.
 */
export function generateStaticParams() {
  return locales.flatMap((locale) =>
    getPublishedProjects().map((project) => ({
      locale,
      slug: project.slug,
    })),
  );
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string; slug: string }>;
}): Promise<Metadata> {
  const { locale, slug } = await params;
  if (!isLocale(locale)) return {};

  const project = getProjectBySlug(slug);
  const content = project ? getProjectContent(project, locale) : undefined;
  // An unknown slug 404s in the component below; returning empty metadata
  // rather than inventing a title keeps the two from disagreeing.
  if (!project || !content) return {};

  const dictionary = await getDictionary(locale);

  return {
    title: content.seoTitle,
    description: content.seoDescription,
    ...pageSeo({
      locale,
      path: projectPath(slug),
      title: `${content.seoTitle} — ${dictionary.site.name}`,
      description: content.seoDescription,
      siteName: dictionary.site.name,
      // The cover photograph, not the generic workshop card. A case study
      // shared into a designer's group chat is judged on that one image.
      image: project.images[0]?.src,
    }),
  };
}

export default async function Page({
  params,
}: {
  params: Promise<{ locale: string; slug: string }>;
}) {
  const { locale, slug } = await params;
  if (!isLocale(locale)) notFound();

  const project = getProjectBySlug(slug);
  if (!project) notFound();

  const content = getProjectContent(project, locale);
  // A project with no written content in *any* locale cannot be rendered — it
  // has no `<h1>`. `getProjectContent` already falls back to `defaultLocale`,
  // so this only fires for a record nobody has written yet.
  if (!content) notFound();

  const dictionary = await getDictionary(locale);
  const path = localeHref(locale, projectPath(slug));

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
          { name: content.title, path },
        ]}
      />
      <ProjectStructuredData
        project={project}
        content={content}
        path={path}
        organizationName={dictionary.site.name}
      />
      <ProjectDetail
        locale={locale}
        dictionary={dictionary}
        project={project}
        content={content}
      />
    </>
  );
}
