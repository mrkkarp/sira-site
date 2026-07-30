import { test, expect } from "@playwright/test";

/**
 * Prompt 9 §9/§10 — real browser coverage of the shop → PDP path, since
 * this is the core discovery flow for every visitor. `/products/odri` is
 * deliberately NOT used here — that slug only exists as unrelated draft
 * test data in the Payload/Postgres admin DB (`_status: "draft"`), not in
 * the static catalog (`src/data/products.source.json`) the storefront
 * actually reads from; visiting it 404s. Real slugs are always the
 * `alias` field from that source file, e.g. `rakovyna-na-pidlohu-odri`.
 */

test("shop catalog lists real products and links to a real PDP", async ({
  page,
}) => {
  await page.goto("/shop");
  await expect(page.getByRole("heading", { level: 1 })).toBeVisible();

  const firstProductLink = page.locator('a[href*="/products/"]').first();
  await expect(firstProductLink).toBeVisible();
  await firstProductLink.click();

  await expect(page).toHaveURL(/\/products\/[a-z0-9-]+$/);
  await expect(page.getByRole("heading", { level: 1 })).toBeVisible();
});

test("PDP defaults to the base-grey CTA, and switches to the quote CTA once the custom-colour swatch is picked", async ({
  page,
}) => {
  await page.goto("/products/rakovyna-na-pidlohu-odri");
  await expect(
    page.getByRole("heading", { name: "ODRI", exact: true }),
  ).toBeVisible();
  await expect(
    page.getByRole("button", { name: "Додати в кошик" }),
  ).toBeVisible();

  // The default selection is the "Сірий базовий" (base grey) colour row,
  // which is a real orderable SKU. "Свій колір" (custom colour) is the
  // product's other real source row, and has no orderable SKU of its own
  // — selecting it swaps the CTA to the quote-request form instead of a
  // fake "add to cart" (see `QuoteRequestForm`'s doc comment / Prompt 6 §6).
  await page.getByRole("option", { name: "Свій колір" }).click();
  await expect(
    page.getByRole("button", { name: "Отримати прорахунок" }),
  ).toBeVisible();
  await expect(
    page.getByRole("button", { name: "Додати в кошик" }),
  ).toHaveCount(0);
});

test("shop filters narrow the visible product grid", async ({ page }) => {
  await page.goto("/shop");
  const resultsCount = page.getByText(/^Знайдено виробів: \d+$/);
  const initialText = await resultsCount.textContent();
  const initialTotal = Number(initialText?.match(/\d+/)?.[0]);
  expect(initialTotal).toBeGreaterThan(0);

  // Desktop sidebar filter checkbox for the custom-colour facet — present
  // directly on the all-products `/shop` view (unlike "mount type", which
  // only has options on category-scoped views), so this doesn't depend on
  // exact per-category facet counts. Asserting on the "Знайдено виробів: N"
  // total (not the on-page card count) because the grid is paginated at a
  // fixed page size, so a filtered result set can still fill a full page.
  // `.click()` rather than `.check()` — checking re-asserts the checkbox's
  // state after the click, but this checkbox's own DOM node is replaced
  // when `DesktopFilterSidebar` applies the filter via `router.push` (a
  // real server-rendered navigation, not a same-node state toggle).
  await page.getByRole("checkbox", { name: /^Індивідуальний колір/ }).click();
  await page.waitForURL(/colour=custom/);

  const filteredText = await resultsCount.textContent();
  const filteredTotal = Number(filteredText?.match(/\d+/)?.[0]);
  expect(filteredTotal).toBeLessThan(initialTotal);
});
