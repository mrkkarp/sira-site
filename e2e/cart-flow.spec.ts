import { test, expect } from "@playwright/test";

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
  await page.goto("/products/rakovyna-na-pidlohu-odri");

  const cartLink = page.getByRole("link", { name: /^Кошик \(\d+\)$/ });
  await expect(cartLink).toHaveAccessibleName("Кошик (0)");

  await page.getByRole("button", { name: "Додати в кошик" }).click();
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
  await page.goto("/products/rakovyna-na-pidlohu-odri");
  await page.getByRole("button", { name: "Додати в кошик" }).click();
  // Wait for the (async, server-persisted) add to actually complete before
  // navigating away — otherwise `page.goto` can race ahead of the POST.
  await expect(
    page.getByRole("link", { name: /^Кошик \(\d+\)$/ }),
  ).toHaveAccessibleName("Кошик (1)");
  await page.goto("/cart");

  const increment = page.getByRole("button", { name: "Кількість +" });
  await increment.click();
  await expect(page.getByRole("status", { name: "Кількість" })).toHaveText("2");

  await page.getByRole("button", { name: "Видалити" }).click();
  await expect(page.getByText("Кошик порожній.")).toBeVisible();
  await expect(
    page.getByRole("link", { name: "Продовжити покупки" }),
  ).toBeVisible();
});
