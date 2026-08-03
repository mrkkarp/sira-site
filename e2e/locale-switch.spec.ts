import { test, expect } from "@playwright/test";

import { visit } from "./support";

/**
 * Prompt 9 §9/§10 — the default locale (`uk`) is unprefixed (see
 * `src/proxy.ts`: only `en`/`pl` get a URL prefix), so switching to `en`
 * and back must be checked against that real routing shape, not a naive
 * `/uk/...` assumption.
 */

test("locale switcher moves between unprefixed uk and prefixed en on the same page", async ({
  page,
}) => {
  await visit(page, "/shop");
  // The footer also has a "Каталог" nav-column heading (`<h2>`,
  // `footerNav.catalogHeading`), so scope to the page's actual `<h1>` to
  // avoid a strict-mode ambiguity.
  await expect(page.locator("h1")).toHaveText("Каталог");

  // Both the header and the footer render a `LocaleSwitcher` instance, and
  // neither is wrapped in a semantic `<header>`/landmark role (header.tsx's
  // root is a plain `<div>`, not a `<header>` element) — so `getByRole`
  // can't scope to "banner". Instead rely on DOM order: `Header` renders
  // before `Footer` in the locale layout, so `.first()` is always the
  // header's instance.
  // Queried by the printed label, which is not the locale code: Ukrainian
  // routes as `uk` but prints as `UA` (see `localeCodeLabels`). `exact` so
  // Playwright's default substring match can't wander onto another link.
  await page.getByRole("link", { name: "EN", exact: true }).first().click();
  await expect(page).toHaveURL(/\/en\/shop$/);
  await expect(page.locator("h1")).toHaveText("Shop");

  await page.getByRole("link", { name: "UA", exact: true }).first().click();
  await expect(page).toHaveURL(/\/shop$/);
  await expect(page).not.toHaveURL(/\/uk\//);
  await expect(page.locator("h1")).toHaveText("Каталог");
});
