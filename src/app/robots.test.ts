import { describe, expect, it } from "vitest";
import robots from "./robots";

const SEARCH_ENGINES = [
  "Googlebot",
  "Googlebot-Image",
  "Google-InspectionTool",
  "Storebot-Google",
  "Bingbot",
];

/**
 * `robots.txt` grew a second group when `/_next/image` was closed to
 * everything except the search engines (see the docblock in `robots.ts` for
 * why the optimizer path is metered and worth protecting).
 *
 * That change introduced a failure mode the single-group version could not
 * have: a crawler obeys the *one* most specific group that matches its
 * user-agent and ignores every other line in the file. So the moment a named
 * group exists, `Disallow: /admin` in the wildcard group stops covering
 * Googlebot — the rule has to be repeated, and nothing about the syntax hints
 * at that. These tests exist to make the omission loud instead of silent.
 */
const rules = () => {
  const value = robots().rules;
  return Array.isArray(value) ? value : [value];
};

const groupFor = (agent: string) =>
  rules().find((rule) => {
    const ua = rule.userAgent;
    return Array.isArray(ua) ? ua.includes(agent) : ua === agent;
  });

const disallowOf = (agent: string) => {
  const value = groupFor(agent)?.disallow;
  if (value === undefined) return [];
  return Array.isArray(value) ? value : [value];
};

describe("robots.txt", () => {
  it("keeps the admin and the API closed to every group, named or not", () => {
    // The regression this is really guarding: adding a named group silently
    // exempts it from the wildcard group's Disallow lines.
    for (const agent of ["*", ...SEARCH_ENGINES]) {
      expect(disallowOf(agent)).toContain("/admin");
      expect(disallowOf(agent)).toContain("/api/");
    }
  });

  it("closes the metered image optimizer to unnamed crawlers", () => {
    expect(disallowOf("*")).toContain("/_next/image");
  });

  it("keeps it open to the crawlers that pay for themselves", () => {
    // Googlebot-Image for Google Images; plain Googlebot because it renders
    // the page to judge layout and Core Web Vitals, and a product page whose
    // photographs fail to load is a page it will judge badly. See robots.ts
    // for what each of the others earns its exemption with.
    for (const agent of SEARCH_ENGINES) {
      expect(disallowOf(agent)).not.toContain("/_next/image");
    }
  });

  it("still points at the sitemap", () => {
    expect(robots().sitemap).toContain("/sitemap.xml");
  });
});
