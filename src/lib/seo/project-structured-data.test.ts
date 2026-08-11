import { describe, expect, it } from "vitest";
import type { Project, ProjectContent } from "@/content/projects";
import { buildProjectJsonLd } from "./project-structured-data";

const content: ProjectContent = {
  title: "Благоустрій території офісу",
  summary: "Вазони, лави та урни з архітектурного бетону.",
  seoTitle: "Благоустрій території офісу, Київ",
  seoDescription: "Опис для пошуку.",
  facts: { client: "Укрсиббанк", typology: "Офісна будівля" },
  sections: [{ heading: "Що зробили", paragraphs: ["Абзац."] }],
};

const project: Project = {
  slug: "demo",
  category: "public",
  year: "2019",
  place: {
    label: { uk: "Київ, Україна", en: "Kyiv, Ukraine", pl: "Kijów, Ukraina" },
    locality: { uk: "Київ", en: "Kyiv", pl: "Kijów" },
    countryCode: "UA",
  },
  images: [
    { src: "/projects/demo/one.jpg", alt: "Перше фото" },
    { src: "/projects/demo/two.jpg", alt: "Друге фото" },
  ],
  relatedCategories: ["planters"],
  content: { uk: content },
};

describe("buildProjectJsonLd", () => {
  it("builds a CreativeWork with absolute image URLs and the creator", () => {
    const json = buildProjectJsonLd({
      project,
      content,
      locale: "uk",
      siteUrl: "https://example.com",
      path: "/projects/demo",
      organizationName: "ODUDLAB",
    });

    expect(json).toEqual({
      "@context": "https://schema.org",
      "@type": "CreativeWork",
      "@id": "https://example.com/projects/demo",
      url: "https://example.com/projects/demo",
      name: content.title,
      headline: content.title,
      description: content.summary,
      inLanguage: "uk",
      image: [
        "https://example.com/projects/demo/one.jpg",
        "https://example.com/projects/demo/two.jpg",
      ],
      creator: {
        "@type": "Organization",
        name: "ODUDLAB",
        url: "https://example.com",
      },
      dateCreated: "2019",
      locationCreated: {
        "@type": "Place",
        address: {
          "@type": "PostalAddress",
          addressLocality: "Київ",
          addressCountry: "UA",
        },
      },
      about: { "@type": "Organization", name: "Укрсиббанк" },
    });
  });

  it("tolerates a trailing slash on the site URL without doubling it", () => {
    const json = buildProjectJsonLd({
      project,
      content,
      locale: "uk",
      siteUrl: "https://example.com/",
      path: "/projects/demo",
      organizationName: "ODUDLAB",
    });

    expect(json.url).toBe("https://example.com/projects/demo");
    expect(json.image).toEqual([
      "https://example.com/projects/demo/one.jpg",
      "https://example.com/projects/demo/two.jpg",
    ]);
  });

  /**
   * The whole point of the all-optional fact model: a project the owner has
   * not given a year, a place or a client for must emit *no* key rather than
   * an empty one. `"dateCreated": ""` is a validation warning and a false
   * statement at the same time, on the one page whose job is being believed.
   */
  it("omits dateCreated, locationCreated and about when the facts are absent", () => {
    const json = buildProjectJsonLd({
      project: {
        ...project,
        year: undefined,
        place: undefined,
      },
      content: { ...content, facts: {} },
      locale: "uk",
      siteUrl: "https://example.com",
      path: "/projects/demo",
      organizationName: "ODUDLAB",
    });

    expect(json).not.toHaveProperty("dateCreated");
    expect(json).not.toHaveProperty("locationCreated");
    expect(json).not.toHaveProperty("about");
  });

  /**
   * Both fields here shipped wrong, and they shipped wrong together: the
   * builder had no `locale`, so `inLanguage` was the literal `"uk"` and
   * `addressLocality` the literal `Київ` on all three routes. The English page
   * therefore declared its English prose to be Ukrainian — a machine-readable
   * contradiction of the document it annotates — and named the city in a
   * script the rest of the page had already translated away from.
   *
   * Asserting per locale rather than once: a fix that hardcoded `"en"` instead
   * of `"uk"` would satisfy a single-locale test just as well as the bug did.
   */
  it.each([
    ["uk", "Київ"],
    ["en", "Kyiv"],
    ["pl", "Kijów"],
  ] as const)(
    "declares %s and spells the city for that locale",
    (locale, city) => {
      const json = buildProjectJsonLd({
        project,
        content,
        locale,
        siteUrl: "https://example.com",
        path: `/${locale}/projects/demo`,
        organizationName: "ODUDLAB",
      });

      expect(json.inLanguage).toBe(locale);
      expect(json.locationCreated).toEqual({
        "@type": "Place",
        address: {
          "@type": "PostalAddress",
          addressLocality: city,
          addressCountry: "UA",
        },
      });
    },
  );
});
