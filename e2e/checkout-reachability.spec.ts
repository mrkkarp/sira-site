import { test, expect } from "@playwright/test";

/**
 * Prompt 9 §9/§10. Deliberately stops short of submitting a real order —
 * `/api/checkout` talks to a real LiqPay redirect/manual-confirmation flow
 * (see `checkout-page-content.tsx`), which isn't something an automated
 * suite should trigger against a real payment provider. This only confirms
 * the honest, already-tested boundary: an empty cart cannot reach the
 * checkout form, and a real cart line renders the real customer-details
 * form (not a placeholder).
 */

test("checkout shows the empty-cart message when the cart is empty", async ({
  page,
}) => {
  await page.goto("/checkout");
  await expect(
    page.getByText("Кошик порожній — додайте товари, щоб оформити замовлення."),
  ).toBeVisible();
});

test("checkout renders the real customer-details form once the cart has an item", async ({
  page,
}) => {
  await page.goto("/products/rakovyna-na-pidlohu-odri");
  await page.getByRole("button", { name: "Додати в кошик" }).click();
  await expect(
    page.getByRole("link", { name: /^Кошик \(\d+\)$/ }),
  ).toHaveAccessibleName("Кошик (1)");

  await page.goto("/checkout");
  await expect(
    page.getByRole("heading", { name: "Контактні дані" }),
  ).toBeVisible();
  await expect(page.getByLabel("Повне ім'я")).toBeVisible();
  // Exact match: the footer's `CallbackForm` (rendered on every page,
  // including `/checkout`) has its own phone field labeled exactly
  // "Телефон" too (fixed to be a real associated `<label>` during Prompt 9's
  // accessibility audit) — the checkout field's own label is "Телефон *".
  await expect(page.getByLabel("Телефон *", { exact: true })).toBeVisible();
  await expect(
    page.getByRole("button", { name: "Оформити замовлення" }),
  ).toBeVisible();
});
