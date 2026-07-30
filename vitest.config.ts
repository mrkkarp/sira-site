import { defineConfig } from "vitest/config";
import react from "@vitejs/plugin-react";
import path from "node:path";

export default defineConfig({
  plugins: [react()],
  test: {
    environment: "jsdom",
    include: ["src/**/*.test.{ts,tsx}"],
    setupFiles: ["./src/test/setup-tests.ts"],
  },
  resolve: {
    alias: {
      // Real `server-only` isn't resolvable outside Next's own webpack build
      // (not a listed dependency) — stand in with a no-op so components/libs
      // that import it can still be unit-tested directly. See the stub file
      // for details.
      "server-only": path.resolve(__dirname, "./src/test/server-only-stub.ts"),
      // Real `@payload-config` resolves to `payload.config.ts` (Postgres
      // adapter, Sharp, every collection) — see the stub file for why unit
      // tests get a lightweight stand-in instead.
      "@payload-config": path.resolve(
        __dirname,
        "./src/test/payload-config-stub.ts",
      ),
      "@": path.resolve(__dirname, "./src"),
    },
  },
});
