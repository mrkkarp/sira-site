import { existsSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { locales } from "@/i18n/config";
import { shopCategoryPath } from "@/lib/schemas/product-categories";
import {
  getProjectBySlug,
  getProjectContent,
  getPublishedProjects,
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

  it("looks a project up by slug and misses cleanly", () => {
    const [first] = getPublishedProjects();
    expect(getProjectBySlug(first.slug)).toBe(first);
    expect(getProjectBySlug("no-such-project")).toBeUndefined();
  });

  it("builds the path the route is served at", () => {
    expect(projectPath("ukrsibbank")).toBe("/projects/ukrsibbank");
  });
});
