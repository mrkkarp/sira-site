import { test, expect } from "@playwright/test";

/**
 * Prompt 9 §9/§10 — the real `not-found.tsx` (App Router 404), not a
 * generic browser error page. `src/proxy.ts` only does a legacy-redirect DB
 * lookup for a first path segment that isn't in its `KNOWN_TOP_LEVEL_SEGMENTS`
 * list, so this nonsense slug is guaranteed not to collide with any real
 * route or legacy redirect and falls through to the real not-found page.
 */

test("visiting an unknown path returns a real 404 with a link back home", async ({
  page,
}) => {
  const response = await page.goto(
    "/this-page-definitely-does-not-exist-xyz123",
  );
  expect(response?.status()).toBe(404);

  await expect(page.getByText("Сторінку не знайдено")).toBeVisible();
  const homeLink = page.getByRole("link", { name: "На головну" });
  await expect(homeLink).toBeVisible();
  await homeLink.click();
  await expect(page).toHaveURL(/\/$/);
});

test("visiting an unknown path under the /en prefix returns the English 404", async ({
  page,
}) => {
  const response = await page.goto(
    "/en/this-page-definitely-does-not-exist-xyz123",
  );
  expect(response?.status()).toBe(404);

  await expect(page.getByText("Page not found")).toBeVisible();
  await expect(page.getByRole("link", { name: "Go home" })).toBeVisible();
});
