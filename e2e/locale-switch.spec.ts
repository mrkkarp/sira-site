import { test, expect, type Page } from "@playwright/test";

import { visit } from "./support";

/**
 * Prompt 9 §9/§10 — the default locale (`uk`) is unprefixed (see
 * `src/proxy.ts`: only `en`/`pl` get a URL prefix), so switching to `en`
 * and back must be checked against that real routing shape, not a naive
 * `/uk/...` assumption.
 */

/**
 * Each heading is matched by role *and* name, not by a bare `locator("h1")`.
 *
 * On a client-side navigation the App Router leaves the outgoing route on
 * screen while the server renders the incoming one — "the old page stays
 * visible until the server finishes rendering" (`instant-navigation.md`) —
 * and `/shop` has no `loading` boundary to swap in meanwhile. So there is a
 * window in which both `<h1>`s are in the document, and `page.locator("h1")`
 * is a strict-mode locator: landing in that window failed with *"resolved to
 * 2 elements: `Каталог` … `Shop`"*. The switch had worked perfectly and the
 * assertion still went red.
 *
 * That window is normally too short to hit, which is why this only ever failed
 * under a loaded dev server — and why it read as a timeout ("waiting for
 * locator") until the actual failure artifact was opened. Naming the heading
 * states what the test means, "the English catalogue page is here", and is
 * indifferent to whether the previous page has finished leaving.
 */
const heading = (page: Page, name: string) =>
  page.getByRole("heading", { level: 1, name, exact: true });

test("locale switcher moves between unprefixed uk and prefixed en on the same page", async ({
  page,
}) => {
  await visit(page, "/shop");
  // The footer also has a "Каталог" nav-column heading (`<h2>`,
  // `footerNav.catalogHeading`), hence the explicit level-1 constraint.
  await expect(heading(page, "Каталог")).toBeVisible();

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
  await expect(heading(page, "Shop")).toBeVisible();

  await page.getByRole("link", { name: "UA", exact: true }).first().click();
  await expect(page).toHaveURL(/\/shop$/);
  await expect(page).not.toHaveURL(/\/uk\//);
  await expect(heading(page, "Каталог")).toBeVisible();
});
