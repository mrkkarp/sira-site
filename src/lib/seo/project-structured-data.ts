import type { Project, ProjectContent } from "@/content/projects";

/**
 * `CreativeWork` JSON-LD for a realised project (`/projects/[slug]`), built as
 * a pure function so it is unit-testable — the same split
 * `buildBreadcrumbJsonLd` and `buildProductJsonLd` use.
 *
 * ## Why `CreativeWork` and not `Article`
 *
 * `Article` is the type that earns a rich result, and it is the tempting
 * choice. It is also the wrong one here, and wrong in a way that costs
 * something: Google's Article guidance is written for news, blog and sports
 * content, and `Article` effectively expects `datePublished` — which this page
 * does not have. The only date on file is the year the *work* was completed,
 * and passing 2019 as a publication date would be a plain falsehood in
 * machine-readable form, in a document whose entire purpose is being believed.
 *
 * `CreativeWork` earns no rich result and claims nothing untrue. What it does
 * earn is real: `image` feeds Google Images, which is where architects and
 * landscape designers actually search for precedent, and `creator` +
 * `locationCreated` tie the page to the ODUDLAB entity and to a city. The
 * SERP feature this page can genuinely win is the breadcrumb, and that comes
 * from `BreadcrumbList` (`buildBreadcrumbJsonLd`), emitted alongside.
 *
 * ## Everything here is derived, nothing is authored
 *
 * Every field reads from the project record. `dateCreated` and
 * `locationCreated` come from `project.year` / `project.place`, the same two
 * locale-neutral values the visible fact sheet renders, so the markup and the
 * page cannot disagree. Absent facts emit no key rather than an empty one —
 * `undefined` properties are dropped, because `"dateCreated": ""` is a
 * validation warning and a lie at the same time.
 */
export function buildProjectJsonLd({
  project,
  content,
  siteUrl,
  path,
  organizationName,
}: {
  project: Project;
  content: ProjectContent;
  /** Absolute site origin, e.g. `https://odudlab.com`. */
  siteUrl: string;
  /** Locale-prefixed path this page is served at, e.g. `/projects/ukrsibbank`. */
  path: string;
  organizationName: string;
}): Record<string, unknown> {
  const base = siteUrl.replace(/\/$/, "");
  const url = `${base}${path}`;

  const json: Record<string, unknown> = {
    "@context": "https://schema.org",
    "@type": "CreativeWork",
    "@id": url,
    url,
    name: content.title,
    headline: content.title,
    description: content.summary,
    inLanguage: "uk",
    image: project.images.map((image) => `${base}${image.src}`),
    creator: {
      "@type": "Organization",
      name: organizationName,
      url: base,
    },
  };

  if (project.year) json.dateCreated = project.year;

  if (project.place) {
    json.locationCreated = {
      "@type": "Place",
      address: {
        "@type": "PostalAddress",
        addressLocality: project.place.locality,
        addressCountry: project.place.countryCode,
      },
    };
  }

  /**
   * `client` is the one fact sheet row with an entity behind it, so it is the
   * one worth expressing as a relationship rather than as text. Deliberately
   * not `sponsor` or `funder`: neither is true, and the bank commissioned the
   * work rather than sponsoring it.
   */
  if (content.facts.client) {
    json.about = { "@type": "Organization", name: content.facts.client };
  }

  return json;
}
