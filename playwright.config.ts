import { defineConfig, devices } from "@playwright/test";

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
    },
    {
      name: "firefox",
      use: { ...devices["Desktop Firefox"] },
    },
    {
      name: "webkit",
      use: { ...devices["Desktop Safari"] },
    },
  ],
});
