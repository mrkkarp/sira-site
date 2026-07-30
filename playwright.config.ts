import { defineConfig, devices } from "@playwright/test";

export default defineConfig({
  testDir: "./e2e",
  fullyParallel: true,
  reporter: "list",
  // First hit to a route in `next dev` compiles it on demand; under three
  // browser engines in parallel that first-compile can briefly exceed the
  // default per-nav timeout. One retry absorbs those cold-compile blips
  // without masking a real regression (a genuine break fails both attempts).
  retries: process.env.CI ? 2 : 1,
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
