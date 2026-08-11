import { describe, expect, it } from "vitest";
import { render, screen } from "@testing-library/react";
import { getDictionary } from "@/i18n/get-dictionary";
import { AboutContent } from "@/components/about/about-content";
import { contact } from "@/config/contact";
import { footerBrandLinks } from "@/config/footer-nav";
import { editorialCampaigns } from "@/config/homepage";

/**
 * What is worth testing on a page that is almost entirely prose.
 *
 * Not the copy itself — asserting that a paragraph contains the words it
 * contains guards nothing and turns every edit into a test edit. What can
 * actually break here is the *wiring*: the anchors other parts of the site
 * point at, the two CTAs, and the address that must come from the one
 * confirmed source rather than from a sentence someone retyped.
 */
async function setup(locale: "uk" | "en" | "pl" = "uk") {
  const dictionary = await getDictionary(locale);
  const { container } = render(
    <AboutContent locale={locale} dictionary={dictionary} />,
  );
  return { dictionary, container };
}

describe("AboutContent", () => {
  it("provides every /about anchor the rest of the site links to", async () => {
    // The footer's brand column and the homepage's production campaign have
    // linked at `/about#production` and `/about#materials` since before this
    // page had content — they used to land on a placeholder's title. Reading
    // the hrefs from the same config the footer renders means adding a new
    // brand link with an anchor fails here rather than shipping a link that
    // scrolls nowhere.
    const { container } = await setup();

    const anchors = [...footerBrandLinks, ...editorialCampaigns]
      .map((link) => link.href)
      .filter((href) => href.startsWith("/about#"))
      .map((href) => href.slice("/about#".length));

    expect(anchors.length).toBeGreaterThan(0);
    for (const anchor of new Set(anchors)) {
      expect(container.querySelector(`#${anchor}`)).not.toBeNull();
    }
  });

  it("offers a way on for both kinds of visitor, not just the catalogue", async () => {
    // §7 of the brief: a lone "buy" CTA on a 19 600 UAH made-to-order piece
    // loses the visitor whose project no catalogue number answers — and that
    // is the more valuable of the two.
    const { dictionary } = await setup();
    const copy = dictionary.aboutPage;

    expect(screen.getByRole("link", { name: copy.ctaPrimary })).toHaveAttribute(
      "href",
      "/shop",
    );
    expect(
      screen.getByRole("link", { name: copy.ctaSecondary }),
    ).toHaveAttribute("href", "/contact");
    expect(
      screen.getByRole("link", { name: copy.designersLink }),
    ).toHaveAttribute("href", "/designers");
  });

  /**
   * Two things at once, and the second is the one that regressed: the address
   * must come from `contact.ts` rather than from a sentence someone retyped
   * (a duplicate drifts from the footer the first time it changes, and a wrong
   * pickup point is worse than none), *and* it must be the line for the locale
   * being rendered. The Cyrillic line used to sit under a translated "Address"
   * label on `/en` and `/pl`, reading as an untranslated leftover.
   */
  it.each(["uk", "en", "pl"] as const)(
    "shows the confirmed address, spelled for %s",
    async (locale) => {
      await setup(locale);
      expect(
        screen.getByText(contact.address.line[locale]),
      ).toBeInTheDocument();
    },
  );

  it("keeps every internal link inside the locale being rendered", async () => {
    // `/en/about` linking to `/care` drops the visitor back into Ukrainian
    // mid-journey.
    const { container } = await setup("en");
    const hrefs = [...container.querySelectorAll("a[href^='/']")].map((link) =>
      link.getAttribute("href"),
    );

    expect(hrefs.length).toBeGreaterThan(0);
    for (const href of hrefs) {
      expect(href).toMatch(/^\/en(\/|$)/);
    }
  });

  it("descends through heading levels without skipping one", async () => {
    // The page is one h1 with h2 sections and h3s inside them; a jump from
    // h2 to h4 is what a screen-reader user navigating by heading actually
    // notices.
    const { container } = await setup();
    const levels = [
      ...container.querySelectorAll("h1, h2, h3, h4, h5, h6"),
    ].map((heading) => Number(heading.tagName[1]));

    expect(levels[0]).toBe(1);
    expect(container.querySelectorAll("h1")).toHaveLength(1);
    for (let index = 1; index < levels.length; index += 1) {
      expect(levels[index] - levels[index - 1]).toBeLessThanOrEqual(1);
    }
  });
});
