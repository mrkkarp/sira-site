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
  // One category and one subcategory: two separate dynamic route modules
  // (`[locale]/[category]` and `[locale]/[category]/[subcategory]`), and the
  // sitemap check in `seo.spec.ts` requests every URL in the sitemap — which
  // now includes six categories and three subcategories. Warming one of each
  // compiles both modules; the rest are then free.
  "/rakovyny",
  "/rakovyny/nakladni",
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

  /**
   * Route handlers, which this list used to miss — and the miss was costing a
   * real, recurring red light. Warming `/products/…` compiles the page a
   * visitor sees, but the very first *add to cart* in the whole run is also
   * the first request `/api/cart/lines` has ever had, so its compile lands
   * inside `cart-flow.spec.ts`'s 5-second "the badge should now read Кошик (1)"
   * assertion. `cart-flow` is alphabetically first and chromium runs first, so
   * that cost reliably fell on the same test — which then failed with the
   * badge still at 0, looking exactly like the cart bug that was already fixed
   * once. It passed on its own every time, which is the signature of a warm-up
   * problem rather than a defect.
   *
   * A `page.goto` sends a GET, and these handlers export POST/PATCH/DELETE, so
   * most answer 405 — which is fine and is the whole point: Next compiles the
   * route module before it can tell the method is unsupported, and compiling
   * is all we are buying. (`goto` rejects on network failures, not on status
   * codes.)
   */
  "/api/cart",
  "/api/cart/lines",
  "/api/cart/lines/warm-up-only",
  "/api/search?q=Odri",
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
