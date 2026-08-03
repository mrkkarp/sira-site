import { test, expect, type Page } from "@playwright/test";

import { visit } from "./support";

/**
 * The `<head>` is the one part of the site no test had ever looked at, and it
 * is the part nobody can see while working on the site either — a missing
 * `og:image` looks like nothing at all in a browser, and only shows up months
 * later as a link that shared with no picture. That is exactly how this
 * regression survived: `/products/[slug]` was the sole route that set one, so
 * every other page — the homepage, the catalogue, contact, collections —
 * pasted into Viber or Telegram as a bare line of text.
 *
 * It also survived because the obvious fix does not work. Next merges metadata
 * between segments *shallowly* (`generate-metadata.md`, "Merging"), so a
 * default `openGraph` in the root layout is silently thrown away by any page
 * exporting its own. The remedy is the shared `pageSeo()` helper, and the
 * remedy's remedy — the thing that keeps a future page from quietly opting
 * out — is this file.
 *
 * `page-seo.test.ts` covers the helper's logic in isolation. This covers the
 * only question that actually matters to a person sharing a link: does the
 * rendered HTML, in a real browser, carry a real picture.
 */

/**
 * One engine, deliberately, against this suite's usual three.
 *
 * Everything asserted below is `<head>` markup produced by the server: all
 * three browsers are handed byte-identical HTML and none of them so much as
 * renders it. Running these on Firefox and WebKit too would triple the
 * navigations for no extra signal — and navigations are exactly this suite's
 * scarce resource, since they all queue behind a single `next dev` process
 * (see the `workers` note in `playwright.config.ts`). Adding this file across
 * three engines was on its own enough to push `locale-switch` past its budget.
 * Engine-specific behaviour earns three engines; server-rendered markup does
 * not.
 */
test.skip(
  ({ browserName }) => browserName !== "chromium",
  "server-rendered <head> markup is identical in every engine",
);

/**
 * Reads a `<meta property="…">`/`<meta name="…">` value, or `null`.
 *
 * A one-shot DOM read rather than a locator, deliberately. A locator's
 * `getAttribute` auto-waits, so a *missing* tag — the exact failure this file
 * is here to catch — spends the full 30s timeout and then reports "waiting for
 * locator" instead of "`/shop` has no og:image". Nothing here needs waiting:
 * the head is server-rendered and complete at `domcontentloaded`, so a missing
 * tag is missing, and returning `null` lets the assertion below say so at once.
 */
function meta(page: Page, key: string): Promise<string | null> {
  return page.evaluate(
    (name) =>
      document.querySelector<HTMLMetaElement>(
        `meta[property="${name}"], meta[name="${name}"]`,
      )?.content ?? null,
    key,
  );
}

/** Every indexable route, and what each one should be sharing a picture of. */
const INDEXABLE_ROUTES = [
  { path: "/", image: "share-card" },
  { path: "/shop", image: "share-card" },
  { path: "/contact", image: "share-card" },
  { path: "/collections", image: "share-card" },
  // The one route that always had its own image: the resolved variant photo.
  { path: "/products/rakovyna-na-pidlohu-odri", image: "own" },
] as const;

for (const route of INDEXABLE_ROUTES) {
  test(`${route.path} shares with a real image, title and description`, async ({
    page,
    request,
  }) => {
    await visit(page, route.path);

    const [title, description, ogTitle, ogImage, ogUrl] = await Promise.all([
      page.title(),
      meta(page, "description"),
      meta(page, "og:title"),
      meta(page, "og:image"),
      meta(page, "og:url"),
    ]);

    expect(title.length).toBeGreaterThan(0);
    expect(description?.length ?? 0).toBeGreaterThan(0);
    expect(ogTitle?.length ?? 0).toBeGreaterThan(0);

    // Absolute, because a relative og:image is not resolvable by the crawler
    // that fetched the URL from a chat message rather than from the site.
    expect(ogImage, `${route.path} has no og:image`).toBeTruthy();
    expect(ogImage).toMatch(/^https?:\/\//);
    expect(ogUrl).toMatch(/^https?:\/\//);

    if (route.image === "share-card") {
      expect(ogImage).toContain("/share/share-card.jpg");
    } else {
      // A product must not fall back to the generic workshop card when it has
      // a photograph of the actual product to hand.
      expect(ogImage).not.toContain("/share/share-card.jpg");
    }

    // An `og:image` pointing at a 404 is worse than none: the crawler caches
    // the failure. This is the assertion that would have caught the share card
    // being generated but never committed.
    const image = await request.get(ogImage!);
    expect(image.status(), `og:image ${ogImage} is not reachable`).toBe(200);
    expect(image.headers()["content-type"]).toMatch(/^image\//);
  });

  test(`${route.path} declares one canonical and an x-default hreflang`, async ({
    page,
  }) => {
    await visit(page, route.path);

    const canonical = page.locator('link[rel="canonical"]');
    await expect(canonical).toHaveCount(1);

    // Only `uk` is indexable (see `indexableLocales`), so the cluster is the
    // Ukrainian URL plus the x-default that points at it — no en/pl alternates
    // advertising pages the site deliberately keeps out of the index.
    const alternates = page.locator('link[rel="alternate"][hreflang]');
    const langs = await alternates.evaluateAll((links) =>
      links.map((link) => link.getAttribute("hreflang")),
    );
    expect(langs).toContain("x-default");
    expect(langs).toContain("uk");
    expect(langs).not.toContain("en");
    expect(langs).not.toContain("pl");
  });
}

/**
 * `/cart` is `noindex` — per-session state with no canonical content in any
 * language — yet it used to emit three `hreflang` alternates anyway, markup
 * that contradicted the `robots` tag beside it. hreflang clusters whose members
 * cannot be indexed are discarded by Google, so the tags were pure noise.
 */
test("a noindex utility route emits no hreflang cluster", async ({ page }) => {
  await visit(page, "/cart");

  await expect(page.locator('link[rel="canonical"]')).toHaveCount(1);
  await expect(page.locator('link[rel="alternate"][hreflang]')).toHaveCount(0);
  expect(await meta(page, "robots")).toContain("noindex");
});
