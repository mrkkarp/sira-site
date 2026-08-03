import { test, expect } from "@playwright/test";

import { visit, waitForHydration } from "./support";

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
  await visit(page, "/shop");
  await expect(page.getByRole("heading", { level: 1 })).toBeVisible();

  const firstProductLink = page.locator('a[href*="/products/"]').first();
  await expect(firstProductLink).toBeVisible();
  // `ProductCard` puts the product's name in an `<h3>` inside the link, so the
  // card tells us what the page it opens must be called.
  const productName = (
    await firstProductLink.getByRole("heading").innerText()
  ).trim();
  await firstProductLink.click();

  await expect(page).toHaveURL(/\/products\/[a-z0-9-]+$/);
  /**
   * Named, not just `getByRole("heading", { level: 1 })`. Two reasons, and the
   * second is the one that bites.
   *
   * It says more: "the PDP for the card I clicked opened", rather than "some
   * page with some `h1` is on screen" — which the catalogue itself satisfies.
   *
   * And it cannot land on the outgoing page. During a client navigation the
   * App Router keeps the previous route mounted until the new one has rendered
   * (see the note in `locale-switch.spec.ts`), so for a moment `/shop`'s `h1`
   * and the product's are both in the document — and an unnamed level-1
   * heading locator is a strict-mode locator that fails on exactly that. The
   * identical assertion in `locale-switch.spec.ts` did fail this way once the
   * dev server was busy enough to stretch the window.
   */
  await expect(
    page.getByRole("heading", { level: 1, name: productName, exact: true }),
  ).toBeVisible();
});

test("PDP defaults to the base-grey CTA, and switches to the quote CTA once the custom-colour swatch is picked", async ({
  page,
}) => {
  await visit(page, "/products/rakovyna-na-pidlohu-odri");
  await expect(
    page.getByRole("heading", { name: "ODRI", exact: true }),
  ).toBeVisible();
  await expect(
    page.getByRole("button", { name: "Додати в кошик" }),
  ).toBeVisible();

  // The default selection is the base-grey colour row, which is a real
  // orderable SKU. The custom-colour row is the product's other real source
  // row and has no orderable SKU of its own — selecting it swaps the CTA to
  // the quote-request form instead of a fake "add to cart" (see
  // `QuoteRequestForm`'s doc comment / Prompt 6 §6).
  //
  // Two things about this locator had rotted, and both were the component
  // getting *better*, not breaking. `ColourSelector` was a listbox and is now
  // a `role="radiogroup"` of `role="radio"` swatches — the right pattern for
  // a permanently-visible single choice, versus a popup. And the custom row's
  // visible title is the dictionary's `colourCustomOptionTitle`, not the raw
  // `colorLabel` ("Свій колір") carried in the snapshot data: the swatch is
  // translated per locale, so the test must not assert on the source string.
  const customColour = page.getByRole("radio", {
    name: "Індивідуальний колір",
  });
  await waitForHydration(customColour);
  await customColour.click();
  // The add-to-cart button must be *gone*, not merely disabled: there is no
  // SKU behind this row, so anything that still looks buyable is a lie about
  // what the shop can actually sell.
  await expect(
    page.getByRole("button", { name: "Додати в кошик" }),
  ).toHaveCount(0);
  const quoteCta = page.getByRole("button", {
    name: "Уточнити індивідуальний колір",
  });
  await expect(quoteCta).toBeVisible();

  // Progressive disclosure, on purpose: the lead form is revealed by an
  // explicit click, never by an auto-appearing modal. So the CTA is a button
  // that swaps itself for the form, and the form is what has to appear —
  // asserting only on the button would pass even if the click did nothing.
  await quoteCta.click();
  await expect(page.getByLabel("Ім'я", { exact: false })).toBeVisible();
});

test("shop filters narrow the visible product grid", async ({ page }) => {
  await visit(page, "/shop");
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
  const customColourFacet = page.getByRole("checkbox", {
    name: /^Індивідуальний колір/,
  });
  await waitForHydration(customColourFacet);
  await customColourFacet.click();
  await page.waitForURL(/colour=custom/);

  const filteredText = await resultsCount.textContent();
  const filteredTotal = Number(filteredText?.match(/\d+/)?.[0]);
  expect(filteredTotal).toBeLessThan(initialTotal);
});
