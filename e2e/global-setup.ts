import { chromium } from "@playwright/test";

/**
 * Compile every route the suite touches, once, before any test runs.
 *
 * The suite runs against `next dev` for a good reason (see the note on
 * `webServer` in `playwright.config.ts`: WebKit refuses `Secure` cookies over
 * plain http, so a production build served over http would drop the cart). The
 * price is that `next dev` compiles each route on first request, and that cost
 * lands inside whichever test asks for it first.
 *
 * Cold, that is survivable. Under the real suite it is not: three browser
 * engines × four workers is a dozen contexts asking a single dev server for a
 * dozen uncompiled routes at once, and compilation does not parallelise. The
 * result was ~10 WebKit failures per run — every one a `page.goto` timeout, on
 * pages that pass in under a second when the same project runs alone. WebKit is
 * simply the slowest of the three and lost every race. Nothing was wrong with
 * the site, and nothing was wrong with the tests, which is the worst kind of
 * red: it trains you to re-run rather than to look.
 *
 * Retries hid this before and shouldn't have to. A retry is for genuine
 * non-determinism; using it to absorb a cost we can pay once, up front, just
 * makes every run slower and the signal weaker.
 *
 * A real browser rather than `fetch`, because a fetch of the HTML compiles the
 * server route but never asks for the client chunks — and those are compiled on
 * demand too.
 */
const ROUTES = [
  "/",
  "/shop",
  "/products/rakovyna-na-pidlohu-odri",
  "/cart",
  "/checkout",
  "/contact",
  "/collections",
  "/warranty",
  "/search?q=Odri",
  // The only prefixed-locale route the suite visits; `/en` compiles separately
  // from the unprefixed default (see `src/proxy.ts`).
  "/en/shop",
];

export default async function globalSetup() {
  const browser = await chromium.launch();
  const page = await browser.newPage();

  try {
    for (const route of ROUTES) {
      // Generous and sequential on purpose: this is the one place in the run
      // where a slow first compile is expected rather than a symptom.
      await page.goto(`http://localhost:3000${route}`, { timeout: 120_000 });
    }
  } finally {
    await browser.close();
  }
}
