/**
 * Test-only stand-in for the generated `@payload-config` alias (which
 * normally resolves to the real `payload.config.ts` — Postgres adapter,
 * Sharp, all collections). Unit tests for the pure mapper functions in
 * `src/repositories/*.payload.ts` only import `getPayloadClient()`
 * transitively (through the file, never actually call it) to reach the
 * mapper they want to test; they never open a real DB connection. This
 * stub lets that import resolve without pulling Postgres/Sharp into the
 * test run, exactly like `server-only-stub.ts` does for `"server-only"`.
 * If a test ever needs a real `getPayload()` call, it must mock
 * `@/lib/payload-client` directly instead of relying on this object.
 */
const stubConfig = {};
export default stubConfig;
