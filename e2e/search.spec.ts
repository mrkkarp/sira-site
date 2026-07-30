import { test, expect } from "@playwright/test";

/**
 * Prompt 9 §9/§10 — the header search drawer (`SearchDrawer`) and the real
 * `/search` results page it links to (both backed by the same
 * `searchCatalog()` in `src/lib/search.ts`).
 */

test("search drawer finds a real product and links to the full results page", async ({
  page,
}) => {
  await page.goto("/");
  await page.getByRole("button", { name: "Пошук", exact: true }).click();

  const dialog = page.getByRole("dialog", { name: "Пошук" });
  await expect(dialog).toBeVisible();

  await dialog.getByRole("searchbox").fill("Odri");
  await expect(dialog.getByText("ODRI", { exact: true }).first()).toBeVisible();

  await dialog
    .getByRole("link", { name: "Переглянути всі результати" })
    .click();
  await expect(page).toHaveURL(/\/search\?q=Odri/);
  await expect(page.getByText("Odri", { exact: false }).first()).toBeVisible();
});

test("search drawer shows a no-results state for a nonsense query", async ({
  page,
}) => {
  await page.goto("/");
  await page.getByRole("button", { name: "Пошук", exact: true }).click();
  const dialog = page.getByRole("dialog", { name: "Пошук" });
  await dialog.getByRole("searchbox").fill("zzzznonexistentqueryzzzz");
  await expect(dialog.getByText("Нічого не знайдено")).toBeVisible();
});
