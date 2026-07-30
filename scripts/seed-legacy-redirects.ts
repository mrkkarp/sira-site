import { getPayload } from "payload";
import config from "../payload.config";
import { seedStaticLegacyRedirects } from "@/services/legacy-static-redirects";

/**
 * Plain Node CLI runner for `seedStaticLegacyRedirects` (Prompt 9 §3 — legacy
 * migration audit). Same standalone-process pattern as
 * `scripts/import-horoshop.ts` (builds its own `Payload` instance via
 * `getPayload({ config })` rather than `getPayloadClient()`, since that
 * import's `server-only` guard only resolves inside Next's own build):
 *
 *   npm run seed:legacy-redirects
 *
 * Idempotent — safe to run more than once; already-seeded rows are skipped,
 * never overwritten.
 */
async function main() {
  const payload = await getPayload({ config });

  const result = await seedStaticLegacyRedirects(payload);

  console.log(
    `Static legacy redirects — created: ${result.created}, already present: ${result.skippedExisting}`,
  );

  process.exit(0);
}

main().catch((error) => {
  console.error("Seeding static legacy redirects failed:", error);
  process.exit(1);
});
