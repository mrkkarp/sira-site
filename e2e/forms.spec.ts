import { test, expect } from "@playwright/test";

/**
 * Prompt 9 §9/§10 — the two real lead-capture forms in the footer:
 * `NewsletterForm` (`src/components/footer/newsletter.tsx`) and
 * `CallbackForm` (`src/components/footer/callback-form.tsx`). Both render
 * inline in the footer on every page (no dialog to open first).
 *
 * The callback form's real success path calls `getLeadRepository().create()`
 * — a genuine Payload/Postgres write, plus a lead-notification adapter (only
 * a console no-op locally, but still a real DB row against whatever Postgres
 * the dev server points to). To keep this suite side-effect-free we only
 * exercise its client-side validation errors, not a real successful submit.
 * The newsletter form's `/api/newsletter` route is a documented mock with no
 * ESP wired in (see that route's own `TODO(integration)` comment) and only
 * logs the submission, so a real successful submit there is safe to test.
 */

test.describe("footer newsletter form", () => {
  test("shows a required-field error on empty submit", async ({ page }) => {
    await page.goto("/");
    await page.getByRole("button", { name: "Підписатися" }).click();
    await expect(page.getByText("Вкажіть електронну адресу.")).toBeVisible();
  });

  test("shows an invalid-email error for a malformed address", async ({
    page,
  }) => {
    await page.goto("/");
    await page.getByLabel("Електронна пошта").fill("not-an-email");
    await page.getByRole("button", { name: "Підписатися" }).click();
    await expect(
      page.getByText("Введіть коректну електронну адресу."),
    ).toBeVisible();
  });

  test("shows a success message for a valid submission", async ({ page }) => {
    await page.goto("/");
    await page
      .getByLabel("Електронна пошта")
      .fill(`e2e-${Date.now()}@example.com`);
    await page.getByRole("button", { name: "Підписатися" }).click();
    await expect(
      page.getByText("Дякуємо! Перевірте пошту для підтвердження підписки."),
    ).toBeVisible();
  });
});

test.describe("footer callback request form", () => {
  test("shows required-field errors for name and phone on empty submit", async ({
    page,
  }) => {
    await page.goto("/");
    await page.getByRole("button", { name: "Замовити дзвінок" }).click();
    await expect(page.getByText("Вкажіть ім'я.")).toBeVisible();
    await expect(page.getByText("Вкажіть номер телефону.")).toBeVisible();
  });

  test("shows an invalid-phone error for a non-empty malformed number", async ({
    page,
  }) => {
    await page.goto("/");
    // `Footer` renders its `contactBlock` (containing `CallbackForm`) twice —
    // once for the `lg:hidden` mobile 2-col grid, once for the `hidden
    // lg:grid` desktop grid — both mounted in the DOM regardless of which
    // is CSS-visible at the current viewport. At the default desktop
    // viewport the second (later in DOM order) instance is the visible one.
    await page.getByLabel("Ім'я").last().fill("Тест");
    await page.getByLabel("Телефон").last().fill("123");
    await page.getByRole("button", { name: "Замовити дзвінок" }).last().click();
    await expect(
      page.getByText("Введіть коректний номер телефону."),
    ).toBeVisible();
    await expect(page.getByText("Вкажіть ім'я.")).toHaveCount(0);
  });
});
