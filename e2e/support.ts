import { expect, type Locator, type Page } from "@playwright/test";

/**
 * Navigate, without waiting for the page's images to arrive.
 *
 * Playwright's `page.goto` defaults to `waitUntil: "load"`, which does not fire
 * until every subresource has downloaded — every photo included. Nothing in
 * this suite asserts on image *bytes*: `next/image` reserves each box from its
 * intrinsic dimensions, so layout, hit targets and every control are final long
 * before a single pixel of a photo lands.
 *
 * Waiting anyway was actively harmful. In `next dev` each image variant is
 * resized on demand by sharp, so a page like `/shop` or the PDP fans out into
 * dozens of CPU-bound requests; with several workers in flight the queue grew
 * past the 30s test budget and `goto` timed out on pages that render instantly.
 * It looked like a WebKit bug because WebKit is the slowest of the three
 * engines and so hit the wall first — but Chromium was on the same cliff, just
 * a little further from the edge.
 *
 * `networkidle` is worse still, and Playwright discourages it: it waits on the
 * same images *plus* the dev server's HMR socket, which never goes quiet.
 *
 * So: wait for the document, then — wherever behaviour is under test — for
 * hydration, via `waitForHydration` below. Those are the two things that
 * actually gate what these tests do.
 */
export async function visit(page: Page, path: string) {
  await page.goto(path, { waitUntil: "domcontentloaded" });
}

/**
 * Wait until React has taken ownership of `locator` — that is, until clicking
 * or typing into it actually reaches the app's own handler.
 *
 * Why this is needed at all: every page here is server-rendered, so the markup
 * is present, visible and clickable some time before the JavaScript that gives
 * it behaviour has run. Playwright's built-in actionability checks look at the
 * DOM (visible, stable, enabled, receives events) and are all satisfied in that
 * window, so a test can click a perfectly real button and have nothing happen,
 * or type into a controlled input and watch React's first render discard the
 * value. On a quiet machine hydration wins the race and the suite is green; run
 * three browser engines at once against `next dev`, which compiles routes on
 * demand, and it does not. That is the entire explanation for a run of
 * intermittent WebKit failures this helper exists to remove — they were never
 * product bugs, and "re-run it" was never a fix.
 *
 * The signal: `react-dom` stamps `__reactFiber$<key>` and `__reactProps$<key>`
 * onto each host DOM node as it hydrates it, and there is no such property
 * before. It is React-internal, and that is the trade being made deliberately —
 * the alternative "waits" available to us are all proxies for the wrong thing.
 * `networkidle` is about the network, `load` fires before hydration by
 * definition, and a fixed `waitForTimeout` just moves the race somewhere less
 * visible. This asks the exact question we mean: has React attached to *this*
 * element yet? If a future React changes the property names, this fails loudly
 * and immediately on every browser, which is the good failure mode: a helper
 * that silently stops waiting would hand the flakiness back with no clue.
 */
export async function waitForHydration(locator: Locator) {
  await locator.waitFor({ state: "visible" });
  await expect
    .poll(
      () =>
        locator.evaluate((element) =>
          Object.keys(element).some((key) => key.startsWith("__reactFiber$")),
        ),
      {
        timeout: 20_000,
        message:
          "element never hydrated — React attached no fiber to it, so clicks and typing would silently do nothing",
      },
    )
    .toBe(true);
}
