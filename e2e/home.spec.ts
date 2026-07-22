import { test, expect } from "@playwright/test";

test("home page renders the hero and primary nav", async ({ page }) => {
  await page.goto("/");
  await expect(page.getByRole("heading", { level: 1 })).toBeVisible();
  await expect(
    page.getByRole("link", { name: "ODUDLAB — home" }),
  ).toBeVisible();
});

test("shop link in the nav goes to the shop page", async ({ page }) => {
  await page.goto("/");
  await page.getByRole("link", { name: "Каталог", exact: true }).click();
  await expect(page).toHaveURL(/\/shop$/);
});
