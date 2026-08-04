import { defineConfig, devices } from "@playwright/test";

/** The legacy-URL sweep, which gets a project of its own — see below. */
const MIGRATION_SPEC = /legacy-urls\.spec\.ts/;

export default defineConfig({
  testDir: "./e2e",
  fullyParallel: true,
  reporter: "list",
  // Every route the suite visits is compiled once, up front — see the long
  // note in `e2e/global-setup.ts`. That is exactly what the retry here used to
  // be paying for: the first hit to a route in `next dev` compiles it on
  // demand, and with three engines asking at once that cost reliably blew the
  // per-navigation timeout in the slowest of them. A retry is the wrong tool
  // for a cost you can pay once; used that way it makes a real regression look
  // like a blip, and teaches everyone to re-run instead of to read.
  globalSetup: "./e2e/global-setup.ts",
  retries: process.env.CI ? 2 : 0,
  // One worker, deliberately, against Playwright's default of half the cores.
  // The shared bottleneck is not the browsers: it is the single `next dev`
  // process behind them, which compiles routes and resizes every image variant
  // on demand and saturates whatever cores it is given. Parallel workers all
  // queue behind that one process, so they buy far less than the numbers
  // suggest and cost a great deal in stability. Measured on this suite, same
  // machine, same code: four workers → 11-14 failures, two → 1-5, one → none.
  // Every one of those failures was a `goto` or a hydration wait running out of
  // budget while the dev server was busy; not one was a defect. Serial is ~2
  // minutes, which is a cheap price for a red light that always means something.
  workers: 1,
  use: {
    baseURL: "http://localhost:3000",
    trace: "on-first-retry",
  },
  // Runs against `next dev` on purpose: the cart session cookie is
  // `Secure` in production (see src/lib/cart-session.ts), and WebKit — unlike
  // Chromium — refuses to store `Secure` cookies over plain http://localhost,
  // so a `next start` build served over http would drop the cart in WebKit.
  // Real production is HTTPS, where `Secure` is correct and works everywhere.
  webServer: {
    command: "npm run dev",
    url: "http://localhost:3000",
    reuseExistingServer: !process.env.CI,
    timeout: 60_000,
  },
  projects: [
    {
      name: "chromium",
      use: { ...devices["Desktop Chrome"] },
      testIgnore: MIGRATION_SPEC,
    },
    {
      name: "firefox",
      use: { ...devices["Desktop Firefox"] },
      testIgnore: MIGRATION_SPEC,
    },
    {
      name: "webkit",
      use: { ...devices["Desktop Safari"] },
      testIgnore: MIGRATION_SPEC,
    },
    // Last, and alone. `legacy-urls.spec.ts` asks for all 184 old Horoshop
    // URLs and then for each of their 108 distinct destinations — and those
    // destinations are mostly product pages, so each one is a Payload query
    // against a *remote* Neon database. That is ~300 requests and ~108 round
    // trips to another continent, aimed at the single `next dev` process and
    // the single connection pool that the rest of the suite is also using.
    //
    // Run inside the `chromium` project it sorts before `locale-switch`,
    // `seo` and the two WebKit cart specs, and it starved them: the cart POST
    // queued behind the sweep's pool traffic and missed the 5s assertion
    // budget, so `Кошик (1)` read `Кошик (0)`. Those three tests pass on their
    // own and passed in the run before this file existed — the sweep was the
    // only new variable. Giving it its own project puts it after every browser
    // project, where the load it creates has nothing left to slow down.
    //
    // One engine, deliberately: every assertion in it is an HTTP status code
    // produced by the proxy before any markup exists, so a second engine would
    // re-ask 300 questions with a known-identical answer.
    {
      name: "migration",
      use: { ...devices["Desktop Chrome"] },
      testMatch: MIGRATION_SPEC,
    },
  ],
});
