import { test, expect } from "@playwright/test";

/**
 * The Horoshop demo catalogue answers `410 Gone` (see `src/lib/gone-paths.ts`
 * for why 410 and not 301 or 404).
 *
 * The *status* is the entire deliverable here and it is the one thing a unit
 * test cannot reach: `gone-paths.test.ts` proves the list and the markup, but
 * only a real request proves the number on the wire. It is also the part that
 * is easiest to lose silently — a page cannot set 410 (only `notFound()`'s
 * 404), and `NextResponse.rewrite(url, { status })` discards the status
 * outright, so any future refactor that routes this through a page or a
 * rewrite would still render the same words while quietly downgrading the
 * answer to a 200 or a 404. Nothing on the screen would look wrong.
 */

test("a Horoshop demo category returns a real 410, not a 404", async ({
  page,
}) => {
  const response = await page.goto("/iphone-13");
  expect(response?.status()).toBe(410);

  await expect(page.getByText("Сторінку видалено назавжди")).toBeVisible();
  const catalogueLink = page.getByRole("link", {
    name: "Перейти до каталогу",
  });
  await expect(catalogueLink).toBeVisible();
  await catalogueLink.click();
  await expect(page).toHaveURL(/\/shop$/);
});

test("the /en twin of a demo category is 410 in English", async ({ page }) => {
  // Every one of these had an `/en/` twin in the old sitemap, and the proxy
  // judges the locale-stripped path — so this is the same row of the table,
  // not a second list to keep in sync.
  const response = await page.goto("/en/womens-fashion");
  expect(response?.status()).toBe(410);

  await expect(page.getByText("This page is gone for good")).toBeVisible();
  await expect(
    page.getByRole("link", { name: "Browse the catalogue" }),
  ).toBeVisible();
});

test("the demo brand index and its brands are gone, not redirected", async ({
  page,
}) => {
  // `/brands` still has a live `Redirects` row pointing at `/shop` from
  // before the brands turned out to be template demo data. The 410 check runs
  // ahead of the redirects lookup precisely so that row cannot answer first —
  // if this ever comes back a 301, that ordering has been lost.
  const index = await page.goto("/brands");
  expect(index?.status()).toBe(410);

  const brand = await page.goto("/apple");
  expect(brand?.status()).toBe(410);
});

test("a real category that shares the shape of a demo one still serves", async ({
  page,
}) => {
  // `/furniture` and `/light` are gone; `/vulychni-mebli` and `/paneli` are
  // live Google Ads landing pages. A 410 is the one answer that tells Google
  // never to return, so a slip in the list here would be unrecoverable.
  for (const path of ["/vulychni-mebli", "/paneli", "/rakovyny", "/shop"]) {
    const response = await page.goto(path);
    expect(response?.status(), `${path} must still serve`).toBe(200);
  }
});
