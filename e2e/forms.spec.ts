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

/**
 * The three lead forms on `/contact`, `/designers` and `/samples`.
 *
 * Their validation, request bodies and analytics are covered field-by-field by
 * the component tests beside each one. What those cannot see is the thing that
 * broke every time: they mount the form *directly*, so they keep passing if the
 * page stops rendering it. All three pages were `PlaceholderPage` until very
 * recently, and a page that quietly reverts to a placeholder is invisible to a
 * test that never loads the page.
 *
 * So this covers the join, and only the join: does the route serve this form,
 * with this page's own copy. One page-specific assertion each, chosen to be the
 * requirement that page does *not* share with the other two — see the table.
 */
const LEAD_PAGES = [
  {
    path: "/contact",
    submit: "Надіслати",
    /**
     * `message` is required here and on no other form, and `email` is optional
     * — deliberately, because the workshop replies by phone or Viber and a
     * required email costs real enquiries. Both halves are asserted: a refactor
     * that "harmonises" the three forms would break exactly this pair.
     */
    required: "Напишіть, будь ласка, кілька слів про ваш запит.",
    optional: "Введіть коректну електронну адресу.",
  },
  {
    path: "/designers",
    submit: "Надіслати запит",
    // The one form where `email` is mandatory: a trade conversation is
    // drawings and a quotation, and a phone number cannot receive an
    // attachment. The message says why the field is there, which a generic
    // "введіть коректну адресу" would not.
    required: "Вкажіть email — на нього надішлемо креслення й прорахунок.",
    optional: null,
  },
  {
    path: "/samples",
    submit: "Замовити зразок",
    // Something physical gets posted, so a sample request with nowhere to send
    // it is a message, not a request.
    required: "Вкажіть, куди надіслати зразок.",
    optional: null,
  },
] as const;

test.describe("the lead forms on /contact, /designers and /samples", () => {
  /**
   * One engine. Nothing below is engine-specific: the markup check never opens
   * a browser at all, and the submit path exercises `useLeadForm`, which the
   * warranty tests above already run on all three. Navigations are this suite's
   * scarce resource — they queue behind a single `next dev` (see the `workers`
   * note in `playwright.config.ts`) — and three engines here would spend nine
   * of them to re-answer a question already answered.
   */
  test.skip(
    ({ browserName }) => browserName !== "chromium",
    "neither the served markup nor the shared form hook is engine-specific",
  );

  for (const lead of LEAD_PAGES) {
    test(`${lead.path} serves its form in the HTML, before any JavaScript`, async ({
      request,
    }) => {
      // A raw fetch, not a page load: no browser, no JS, no hydration — which
      // is the whole point. Brief §2 asks that the text a visitor and a crawler
      // need is in the document the server sends, and a form that only appears
      // after React boots fails that for the crawler regardless of how it looks
      // on screen.
      const response = await request.get(lead.path);
      expect(response.status()).toBe(200);
      const html = await response.text();

      // The honeypot is rendered by every lead form and by nothing else, so
      // this is markup that only exists if a real form was rendered — unlike a
      // heading, which a placeholder could also carry.
      expect(html, `${lead.path} serves no lead form`).toContain(
        'name="companyWebsite"',
      );
      // …and that it is *this* page's form, not some other one wired up by
      // mistake. The submit CTA differs on all three.
      expect(html).toContain(lead.submit);
    });

    test(`${lead.path} asks for what only it needs`, async ({ page }) => {
      await visit(page, lead.path);
      const submit = page.getByRole("button", { name: lead.submit });
      // Same race as the warranty form: `noValidate` means a pre-hydration
      // click is a native submit that navigates away instead of validating.
      await waitForHydration(submit);
      await submit.click();

      await expect(page.getByText(lead.required)).toBeVisible();
      if (lead.optional) {
        await expect(page.getByText(lead.optional)).toHaveCount(0);
      }
    });
  }

  test("/designers serves the qualification questions with every option", async ({
    request,
  }) => {
    // The two `<select>`s are the only part of a lead form whose valid answers
    // are duplicated across a client array, a server enum, a Postgres type and
    // three dictionaries. `qualification-fields.test.ts` keeps those four in
    // step with each other; this asserts the fifth thing, which no unit test
    // can see — that the real page actually renders them, server-side, with
    // real labels rather than an empty dropdown.
    const response = await request.get("/designers");
    expect(response.status()).toBe(200);
    const html = await response.text();

    for (const value of [
      "private",
      "commercial",
      "outdoor",
      "other",
      "now",
      "quarter",
      "exploring",
    ]) {
      expect(html, `/designers offers no "${value}" option`).toContain(
        `value="${value}"`,
      );
    }

    // Skipping is a real, selectable answer — not a disabled prompt — because
    // both questions are optional and an answer must be retractable.
    expect(html).toContain("Не вказувати");
  });
});
