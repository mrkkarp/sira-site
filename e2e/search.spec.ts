import { test, expect } from "@playwright/test";

import { visit, waitForHydration } from "./support";

/**
 * Prompt 9 §9/§10 — the header search drawer (`SearchDrawer`) and the real
 * `/search` results page it links to (both backed by the same
 * `searchCatalog()` in `src/lib/search.ts`).
 */

/** The drawer exists only client-side, so the button that opens it does nothing until React attaches. */
async function openSearchDrawer(page: import("@playwright/test").Page) {
  const trigger = page.getByRole("button", { name: "Пошук", exact: true });
  await waitForHydration(trigger);
  await trigger.click();
}

test("search drawer finds a real product and links to the full results page", async ({
  page,
}) => {
  await visit(page, "/");
  await openSearchDrawer(page);

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

test("search drawer shows a no-results state for a nonsense query, and says so out loud", async ({
  page,
}) => {
  await visit(page, "/");
  await openSearchDrawer(page);
  const dialog = page.getByRole("dialog", { name: "Пошук" });
  await dialog.getByRole("searchbox").fill("zzzznonexistentqueryzzzz");

  // "Нічого не знайдено" is deliberately in the drawer twice: once visibly,
  // once inside the `sr-only aria-live` region that announces the outcome to
  // a screen reader (`search-drawer.tsx`). A search that silently swaps its
  // contents is the classic live-region case — without it, a blind visitor
  // gets no signal that anything happened at all.
  //
  // So this asserts the two separately. A bare `getByText` matches both and
  // fails Playwright's strict mode, which is what it used to do: the test was
  // red because it could not tell the two apart, not because either was
  // missing.
  await expect(dialog.getByText("Спробуйте інший запит.")).toBeVisible();
  await expect(dialog.getByText("Нічого не знайдено").first()).toHaveCount(1);
});
