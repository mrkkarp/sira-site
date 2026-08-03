import { test, expect } from "@playwright/test";

import { visit, waitForHydration } from "./support";

/**
 * Client-side validation on a real lead form, in a real browser.
 *
 * This file used to cover a footer newsletter strip and a "Замовити дзвінок"
 * callback form. Both were removed at the owner's request — the site does not
 * collect subscriptions or call-back requests, and `src/components/footer.tsx`
 * carries an explicit "do not reinstate them" note. The `/api/newsletter` and
 * `/api/callback` routes went with them. The tests did not, so five of them
 * sat red against markup that no longer exists, quietly turning "the E2E suite
 * is failing" into background noise. They are replaced here rather than
 * deleted, because what they were actually proving — that a failed submit
 * surfaces a per-field message the visitor can act on — still matters.
 *
 * The warranty request is the right stand-in: it is a genuine lead form that
 * still ships, and an *invalid* submit is the one path that is guaranteed
 * side-effect-free. A valid one calls `getLeadRepository().create()`, a real
 * Payload/Postgres write against whatever database the dev server points at,
 * so this suite never completes one. That is also why nothing here types a
 * real name or phone number.
 */

test.describe("warranty request form", () => {
  test("marks every empty required field on submit, not just the first", async ({
    page,
  }) => {
    await visit(page, "/warranty");
    const submit = page.getByRole("button", { name: "Надіслати заявку" });
    // The form is `noValidate`, so a click that lands before React attaches is
    // a plain native submit: the page navigates and no error is ever rendered.
    await waitForHydration(submit);
    await submit.click();

    // All three at once. A form that stops at the first failure makes the
    // visitor re-submit once per mistake to discover the next one.
    await expect(page.getByText("Вкажіть ім'я.")).toBeVisible();
    await expect(page.getByText("Вкажіть номер телефону.")).toBeVisible();
    await expect(page.getByText("Опишіть, будь ласка, проблему")).toBeVisible();
  });

  test("tells a malformed phone apart from a missing one", async ({ page }) => {
    await visit(page, "/warranty");

    // Every field is controlled React state, so a value typed before hydration
    // is discarded by the first render. This exact race was a WebKit-only
    // failure that pointed at the wrong thing: only the *name* was wiped, so it
    // read as a name-field bug, when in truth the phone had simply been typed a
    // fraction later — after React attached — and survived.
    const name = page.getByLabel("Ім'я", { exact: false });
    await waitForHydration(name);
    await name.fill("Тест");
    await page.getByLabel("Телефон", { exact: false }).fill("123");
    await page.getByRole("button", { name: "Надіслати заявку" }).click();

    // "Вкажіть номер телефону." on a filled box would read as if the field
    // were still empty, sending the visitor looking for a box they already
    // completed.
    await expect(
      page.getByText("Введіть коректний номер телефону."),
    ).toBeVisible();
    await expect(page.getByText("Вкажіть номер телефону.")).toHaveCount(0);
    await expect(page.getByText("Вкажіть ім'я.")).toHaveCount(0);
  });
});
