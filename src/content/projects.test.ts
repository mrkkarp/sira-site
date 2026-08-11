import { existsSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { locales } from "@/i18n/config";
import { shopCategoryPath } from "@/lib/schemas/product-categories";
import {
  getProjectBySlug,
  getProjectContent,
  getProjectGroups,
  getPublishedProjects,
  projectCategoryOrder,
  projectPath,
} from "./projects";

const publicDir = join(process.cwd(), "public");

describe("project registry", () => {
  it("publishes at least one project", () => {
    expect(getPublishedProjects().length).toBeGreaterThan(0);
  });

  it("only publishes projects that have photographs", () => {
    for (const project of getPublishedProjects()) {
      expect(project.images.length).toBeGreaterThan(0);
    }
  });

  /**
   * The load-bearing test in this file. Project photographs are referenced by
   * string path, so a rename, a case change or a `.png`/`.jpg` slip produces a
   * page that still renders — with `ProductImage`'s neutral "photo
   * unavailable" fallback where the proof was supposed to be. On the one page
   * whose whole job is showing a finished object, that failure is both silent
   * and total, so it gets caught at build time instead.
   */
  it("references image files that actually exist in public/", () => {
    for (const project of getPublishedProjects()) {
      for (const image of project.images) {
        expect(image.src.startsWith("/")).toBe(true);
        expect(
          existsSync(join(publicDir, image.src)),
          `missing file for ${project.slug}: public${image.src}`,
        ).toBe(true);
      }
    }
  });

  /** Alt text is what Google Images reads and what a screen reader announces;
   * an empty string would make the photograph invisible to both. */
  it("gives every photograph non-trivial alt text", () => {
    for (const project of getPublishedProjects()) {
      for (const image of project.images) {
        expect(image.alt.trim().length).toBeGreaterThan(10);
      }
    }
  });

  it("has no duplicate slugs", () => {
    const slugs = getPublishedProjects().map((project) => project.slug);
    expect(new Set(slugs).size).toBe(slugs.length);
  });

  /** `relatedCategories` are resolved through `shopCategoryPath`, so an
   * identifier that is not a real category would throw at render time. */
  it("links only real catalogue categories", () => {
    for (const project of getPublishedProjects()) {
      for (const category of project.relatedCategories) {
        expect(() => shopCategoryPath(category)).not.toThrow();
      }
    }
  });

  it("resolves content in every locale, falling back to Ukrainian", () => {
    for (const project of getPublishedProjects()) {
      for (const locale of locales) {
        const content = getProjectContent(project, locale);
        expect(
          content,
          `${project.slug} has no content for ${locale}`,
        ).toBeDefined();
        expect(content!.title.length).toBeGreaterThan(0);
        expect(content!.summary.length).toBeGreaterThan(0);
        expect(content!.seoTitle.length).toBeGreaterThan(0);
        expect(content!.seoDescription.length).toBeGreaterThan(0);
        expect(content!.sections.length).toBeGreaterThan(0);
      }
    }
  });

  /**
   * A translation may render a fact differently. It may not add one, and it
   * may not drop one. Both failures are invisible to a reviewer who reads only
   * their own language, and the fact sheet is exactly where an invented row
   * would do the most damage — so the shape is asserted instead: same fact
   * keys, same number of sections, same number of paragraphs in each. Prose
   * that says something the Ukrainian does not still gets through, but a
   * fabricated *row* cannot.
   */
  it("keeps every translation structurally identical to the Ukrainian", () => {
    for (const project of getPublishedProjects()) {
      const source = project.content.uk;
      expect(source, `${project.slug} has no Ukrainian content`).toBeDefined();

      for (const locale of locales) {
        if (locale === "uk") continue;
        const translated = project.content[locale];
        if (!translated) continue; // Absent is allowed; incomplete is not.

        const where = `${project.slug}/${locale}`;
        expect(Object.keys(translated.facts).sort(), `${where} facts`).toEqual(
          Object.keys(source!.facts).sort(),
        );
        expect(translated.sections, `${where} sections`).toHaveLength(
          source!.sections.length,
        );
        translated.sections.forEach((section, index) => {
          expect(section.heading.trim().length).toBeGreaterThan(0);
          expect(
            section.paragraphs,
            `${where} section ${index} paragraphs`,
          ).toHaveLength(source!.sections[index].paragraphs.length);
        });
      }
    }
  });

  it("looks a project up by slug and misses cleanly", () => {
    const [first] = getPublishedProjects();
    expect(getProjectBySlug(first.slug)).toBe(first);
    expect(getProjectBySlug("no-such-project")).toBeUndefined();
  });

  it("builds the path the route is served at", () => {
    expect(projectPath("ukrsibbank")).toBe("/projects/ukrsibbank");
  });
});

describe("project groups", () => {
  /**
   * The whole reason `getProjectGroups` exists rather than a `groupBy` at the
   * call site: an empty category must survive to the page. `interior` holds
   * nothing today and still gets its heading and its explanation, on the
   * owner's instruction. A `filter(g => g.projects.length)` added later "to
   * tidy up" would silently delete that, and the page would look correct while
   * having lost the half of the business it was added to announce.
   */
  it("returns every category in order, including the empty ones", () => {
    const groups = getProjectGroups();
    expect(groups.map((group) => group.category)).toEqual([
      ...projectCategoryOrder,
    ]);
  });

  it("files every published project into exactly one group", () => {
    const groups = getProjectGroups();
    const grouped = groups.flatMap((group) => group.projects);
    expect(grouped).toHaveLength(getPublishedProjects().length);
    expect(new Set(grouped.map((project) => project.slug)).size).toBe(
      grouped.length,
    );
  });

  it("puts each project under the category it declares", () => {
    for (const group of getProjectGroups()) {
      for (const project of group.projects) {
        expect(project.category).toBe(group.category);
      }
    }
  });
});
