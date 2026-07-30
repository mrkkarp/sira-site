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
  // "Каталог" is a `MegaMenu` trigger `<button>` (`src/components/header/
  // mega-menu.tsx`), not a direct link — the real `/shop` link ("Усі
  // вироби") only mounts once the panel is opened.
  await page.getByRole("button", { name: "Каталог" }).click();
  // "Усі вироби" also appears in the homepage's own main content and in the
  // footer's catalog column — scope to the open mega-menu panel itself
  // (`role="region"`, `aria-label` = the trigger's label).
  const panel = page.getByRole("region", { name: "Каталог" });
  await panel.getByRole("link", { name: "Усі вироби" }).click();
  await expect(page).toHaveURL(/\/shop$/);
});
