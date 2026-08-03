import { test, expect } from "@playwright/test";

import { visit, waitForHydration } from "./support";

/**
 * Prompt 9 §9/§10 — real add/adjust/remove cart flow. Checkout/payment
 * itself is an explicit, honestly-labeled out-of-scope gap (see
 * `CartButton`'s doc comment) — only add/remove/persist is real, so this
 * stops at confirming `/checkout` is reachable once the cart is non-empty,
 * rather than attempting a real payment.
 */

test("adding a product updates the header cart count and the cart page", async ({
  page,
}) => {
  await visit(page, "/products/rakovyna-na-pidlohu-odri");

  const cartLink = page.getByRole("link", { name: /^Кошик \(\d+\)$/ });
  await expect(cartLink).toHaveAccessibleName("Кошик (0)");

  // Add-to-cart is pure client behaviour, and the button is fully clickable
  // as server-rendered HTML before any of it exists — so an early click is
  // swallowed and the count simply stays at 0. Retrying the click is not the
  // fix here: if the first one *did* register and was merely slow, a second
  // would put two sinks in the cart and the assertion below would still fail,
  // now for a different reason.
  const addToCart = page.getByRole("button", { name: "Додати в кошик" });
  await waitForHydration(addToCart);
  await addToCart.click();
  await expect(cartLink).toHaveAccessibleName("Кошик (1)");
  // The add-to-cart toast announcement (shared `ToastProvider`, aria-live).
  await expect(page.getByText("ODRI додано в кошик")).toBeVisible();

  await cartLink.click();
  await expect(page).toHaveURL(/\/cart$/);
  await expect(page.getByText("ODRI", { exact: true })).toBeVisible();
  await expect(
    page.getByRole("link", { name: "Оформити замовлення" }),
  ).toBeVisible();
});

test("quantity controls and remove work on the cart page", async ({ page }) => {
  await visit(page, "/products/rakovyna-na-pidlohu-odri");
  const addToCart = page.getByRole("button", { name: "Додати в кошик" });
  await waitForHydration(addToCart);
  await addToCart.click();
  // Wait for the (async, server-persisted) add to actually complete before
  // navigating away — otherwise `page.goto` can race ahead of the POST.
  await expect(
    page.getByRole("link", { name: /^Кошик \(\d+\)$/ }),
  ).toHaveAccessibleName("Кошик (1)");
  await visit(page, "/cart");

  // Each control names the product it acts on ("Збільшити кількість: ODRI",
  // not a bare "Кількість +"). A cart is a list of near-identical rows, and
  // an unqualified label is ambiguous the moment there are two of them — so
  // these locators are now exact, product-scoped names by design, and a
  // regression to shared labels would make `getByRole` throw on strict mode
  // rather than silently pick the first row.
  const increment = page.getByRole("button", {
    name: "Збільшити кількість: ODRI",
  });
  await waitForHydration(increment);
  await increment.click();
  await expect(
    page.getByRole("status", { name: "Кількість: ODRI" }),
  ).toHaveText("2");

  await page.getByRole("button", { name: "Видалити з кошика: ODRI" }).click();
  await expect(page.getByText("Кошик порожній.")).toBeVisible();
  await expect(
    page.getByRole("link", { name: "Продовжити покупки" }),
  ).toBeVisible();
});
