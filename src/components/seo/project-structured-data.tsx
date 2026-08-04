import type { Project, ProjectContent } from "@/content/projects";
import { getSiteUrl } from "@/lib/site-url";
import { buildProjectJsonLd } from "@/lib/seo/project-structured-data";
import { serializeJsonLd } from "@/lib/json-ld";

/**
 * Renders the `CreativeWork` JSON-LD for one project, mirroring
 * `BreadcrumbStructuredData`'s thin-component-over-pure-builder shape. All the
 * reasoning about *what* is emitted lives in
 * `src/lib/seo/project-structured-data.ts`.
 */
export function ProjectStructuredData({
  project,
  content,
  path,
  organizationName,
}: {
  project: Project;
  content: ProjectContent;
  path: string;
  organizationName: string;
}) {
  const json = buildProjectJsonLd({
    project,
    content,
    siteUrl: getSiteUrl().toString(),
    path,
    organizationName,
  });

  return (
    <script
      type="application/ld+json"
      dangerouslySetInnerHTML={{ __html: serializeJsonLd(json) }}
    />
  );
}
