import { getPayload } from "payload";
import config from "../payload.config";
import { runHoroshopImport } from "@/services/horoshop-import-service";

/**
 * Plain Node CLI runner for the Horoshop importer (Phase G). Run via the
 * npm scripts below (they load `.env.local` with Node's own
 * `--env-file-if-exists` — this script is a standalone process, not part
 * of Next's build, so it doesn't get `.env.local` for free the way `next
 * dev`/`next build` do):
 *
 *   npm run import:horoshop           # dry run (default, safe)
 *   npm run import:horoshop:live      # real writes
 *
 * Deliberately outside Next's build (a standalone script, not an API route
 * or server action): the real Horoshop import is a manual, occasional batch
 * job an operator runs from a terminal, not something the running site
 * triggers itself. It builds its own `Payload` instance directly via
 * `getPayload({ config })` — the same pattern `scripts-seed-tmp.mjs` (now
 * superseded by this script) used — because `getPayloadClient()`
 * (`src/lib/payload-client.ts`) imports the real `server-only` package,
 * which only resolves inside Next's own webpack build and would fail here.
 *
 * Defaults to `dryRun` so an operator never accidentally writes to
 * production Postgres by forgetting a flag — `--live` (or `--mode=live`)
 * opts in explicitly.
 */
async function main() {
  const args = process.argv.slice(2);
  const isLive = args.includes("--live") || args.includes("--mode=live");
  const mode = isLive ? "live" : "dryRun";

  const notesArg = args.find((arg) => arg.startsWith("--notes="));
  const notes = notesArg ? notesArg.slice("--notes=".length) : undefined;

  console.log(
    `Horoshop import — mode: ${mode}${isLive ? "" : " (no writes will be made; pass --live to write for real)"}`,
  );

  const payload = await getPayload({ config });

  const result = await runHoroshopImport({ mode, notes }, { payload });

  console.log(`Import batch #${result.batchId} — status: ${result.status}`);
  console.log("Totals:", result.totals);

  process.exit(0);
}

main().catch((error) => {
  console.error("Horoshop import failed:", error);
  process.exit(1);
});
